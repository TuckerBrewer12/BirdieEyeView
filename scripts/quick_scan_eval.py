"""Run the small live scorecard accuracy evaluation suite.

Usage:
    python -m scripts.quick_scan_eval

The runner mirrors the production frontend flow: OCR each unique image once,
then pass the prefetched OCR text through the production extract path for each
target player. Accuracy failures are reported but do not fail the process.
"""

from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import statistics
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Awaitable, Callable, Iterable, Mapping, Optional

from dotenv import load_dotenv
from fastapi import UploadFile
from PIL import Image, ImageOps
from starlette.datastructures import Headers


ROOT_DIR = Path(__file__).resolve().parents[1]
SCORECARD_DIR = ROOT_DIR / "tests" / "test_scorecards"
DEFAULT_MANIFEST_PATH = SCORECARD_DIR / "quick_eval_cases.json"
SUPPORTED_FIELDS = frozenset({"strokes", "putts", "shots_to_green"})
SUPPORTED_SCORE_FORMATS = frozenset({"raw_strokes", "to_par"})
ALL_HOLES = frozenset(range(1, 19))
EVAL_UPLOAD_LONG_EDGE = 2000
EVAL_UPLOAD_QUALITY = 80

PrefetchCallable = Callable[..., Awaitable[Any]]
ExtractCallable = Callable[..., Awaitable[Any]]


class EvalConfigurationError(ValueError):
    """Raised when the evaluator cannot start with a trustworthy configuration."""


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    image: str
    player_name: str
    source_score_format: str
    user_context: str
    expected: Mapping[str, Mapping[int, int]]

    @property
    def expected_cells(self) -> int:
        return sum(len(holes) for holes in self.expected.values())


@dataclass(frozen=True)
class CellMismatch:
    field_name: str
    hole_number: int
    expected: int
    actual: Any


@dataclass
class CaseResult:
    case: EvalCase
    matched_cells: int
    total_cells: int
    extraction_seconds: float = 0.0
    effective_seconds: float = 0.0
    mismatches: list[CellMismatch] = field(default_factory=list)
    operational_error: Optional[str] = None

    @property
    def accuracy(self) -> float:
        if self.operational_error or self.total_cells == 0:
            return 0.0
        return self.matched_cells / self.total_cells

    def meets(self, percent: int) -> bool:
        return (
            self.operational_error is None
            and self.total_cells > 0
            and self.matched_cells * 100 >= self.total_cells * percent
        )


@dataclass(frozen=True)
class SuiteSummary:
    total: int
    perfect: int
    at_least_90: int
    at_least_80: int
    failed: int


@dataclass
class SuiteRun:
    case_results: list[CaseResult]
    ocr_seconds_by_image: dict[str, float]
    suite_seconds: float

    @property
    def completed_cases(self) -> int:
        return sum(result.operational_error is None for result in self.case_results)


def _require_string(raw: Mapping[str, Any], key: str, case_label: str) -> str:
    value = raw.get(key)
    if not isinstance(value, str) or not value.strip():
        raise EvalConfigurationError(f"{case_label}: {key} must be a non-empty string")
    return value.strip()


def load_cases(
    manifest_path: Path = DEFAULT_MANIFEST_PATH,
    *,
    scorecard_dir: Path = SCORECARD_DIR,
) -> list[EvalCase]:
    """Load and validate the quick-suite answer key."""
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise EvalConfigurationError(f"Manifest not found: {manifest_path}") from exc
    except json.JSONDecodeError as exc:
        raise EvalConfigurationError(f"Manifest is not valid JSON: {exc}") from exc

    if not isinstance(payload, dict) or payload.get("version") != 1:
        raise EvalConfigurationError("Manifest version must be 1")
    raw_cases = payload.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise EvalConfigurationError("Manifest must contain at least one case")

    cases: list[EvalCase] = []
    seen_ids: set[str] = set()
    base_dir = scorecard_dir.resolve()

    for index, raw in enumerate(raw_cases, start=1):
        label = f"case #{index}"
        if not isinstance(raw, dict):
            raise EvalConfigurationError(f"{label}: case must be an object")

        case_id = _require_string(raw, "id", label)
        label = case_id
        if case_id in seen_ids:
            raise EvalConfigurationError(f"Duplicate case id: {case_id}")
        seen_ids.add(case_id)

        image = _require_string(raw, "image", label)
        image_path = (scorecard_dir / image).resolve()
        if image_path.parent != base_dir or not image_path.is_file():
            raise EvalConfigurationError(f"{label}: image not found in {scorecard_dir}: {image}")

        player_name = _require_string(raw, "player_name", label)
        source_score_format = _require_string(raw, "source_score_format", label)
        if source_score_format not in SUPPORTED_SCORE_FORMATS:
            raise EvalConfigurationError(
                f"{label}: source_score_format must be one of {sorted(SUPPORTED_SCORE_FORMATS)}"
            )
        user_context = _require_string(raw, "user_context", label)

        raw_expected = raw.get("expected")
        if not isinstance(raw_expected, dict) or not raw_expected:
            raise EvalConfigurationError(f"{label}: expected must contain at least one field")

        expected: dict[str, dict[int, int]] = {}
        for field_name, raw_holes in raw_expected.items():
            if field_name not in SUPPORTED_FIELDS:
                raise EvalConfigurationError(f"{label}: unsupported expected field: {field_name}")
            if not isinstance(raw_holes, dict):
                raise EvalConfigurationError(f"{label}: {field_name} must map hole numbers to values")

            hole_values: dict[int, int] = {}
            for raw_hole, value in raw_holes.items():
                try:
                    hole_number = int(raw_hole)
                except (TypeError, ValueError) as exc:
                    raise EvalConfigurationError(
                        f"{label}: invalid hole number for {field_name}: {raw_hole!r}"
                    ) from exc
                if isinstance(value, bool) or not isinstance(value, int):
                    raise EvalConfigurationError(
                        f"{label}: {field_name} hole {hole_number} must be an integer"
                    )
                if hole_number in hole_values:
                    raise EvalConfigurationError(
                        f"{label}: duplicate {field_name} hole {hole_number}"
                    )
                hole_values[hole_number] = value

            if set(hole_values) != ALL_HOLES:
                missing = sorted(ALL_HOLES - set(hole_values))
                extra = sorted(set(hole_values) - ALL_HOLES)
                raise EvalConfigurationError(
                    f"{label}: {field_name} must define holes 1-18; missing={missing} extra={extra}"
                )
            expected[field_name] = dict(sorted(hole_values.items()))

        cases.append(
            EvalCase(
                case_id=case_id,
                image=image,
                player_name=player_name,
                source_score_format=source_score_format,
                user_context=user_context,
                expected=expected,
            )
        )

    return cases


def grade_case(
    case: EvalCase,
    hole_scores: Iterable[Mapping[str, Any]],
    *,
    extraction_seconds: float = 0.0,
    effective_seconds: float = 0.0,
) -> CaseResult:
    """Compare final production hole scores to one numeric answer key."""
    actual_by_hole: dict[int, Mapping[str, Any]] = {}
    for row in hole_scores:
        hole_number = row.get("hole_number")
        if isinstance(hole_number, int) and hole_number in ALL_HOLES:
            actual_by_hole[hole_number] = row

    mismatches: list[CellMismatch] = []
    matched = 0
    for field_name, expected_holes in case.expected.items():
        for hole_number, expected in expected_holes.items():
            actual = actual_by_hole.get(hole_number, {}).get(field_name)
            if actual == expected and not isinstance(actual, bool):
                matched += 1
            else:
                mismatches.append(
                    CellMismatch(
                        field_name=field_name,
                        hole_number=hole_number,
                        expected=expected,
                        actual=actual,
                    )
                )

    return CaseResult(
        case=case,
        matched_cells=matched,
        total_cells=case.expected_cells,
        extraction_seconds=extraction_seconds,
        effective_seconds=effective_seconds,
        mismatches=mismatches,
    )


def summarize(results: Iterable[CaseResult]) -> SuiteSummary:
    result_list = list(results)
    at_least_80 = sum(result.meets(80) for result in result_list)
    return SuiteSummary(
        total=len(result_list),
        perfect=sum(result.meets(100) for result in result_list),
        at_least_90=sum(result.meets(90) for result in result_list),
        at_least_80=at_least_80,
        failed=len(result_list) - at_least_80,
    )


def _make_upload(image_name: str, image_bytes: bytes) -> UploadFile:
    content_type = mimetypes.guess_type(image_name)[0] or "application/octet-stream"
    return UploadFile(
        file=BytesIO(image_bytes),
        filename=image_name,
        headers=Headers({"content-type": content_type}),
    )


def prepare_image_for_upload(image_name: str, image_bytes: bytes) -> tuple[str, bytes]:
    """Apply the Scan UI's 2000px/Q80 image policy to one eval fixture."""
    content_type = mimetypes.guess_type(image_name)[0] or ""
    if not content_type.startswith("image/") or content_type == "image/gif":
        return image_name, image_bytes

    try:
        with Image.open(BytesIO(image_bytes)) as opened:
            image = ImageOps.exif_transpose(opened)
            if image.mode != "RGB":
                image = image.convert("RGB")

            long_edge = max(image.size)
            if long_edge > EVAL_UPLOAD_LONG_EDGE:
                scale = EVAL_UPLOAD_LONG_EDGE / float(long_edge)
                image = image.resize(
                    (
                        max(1, round(image.width * scale)),
                        max(1, round(image.height * scale)),
                    ),
                    Image.Resampling.LANCZOS,
                )

            output = BytesIO()
            image.save(
                output,
                format="JPEG",
                quality=EVAL_UPLOAD_QUALITY,
                optimize=True,
                progressive=True,
                exif=b"",
                icc_profile=None,
            )
    except Exception:  # noqa: BLE001 - production endpoints report invalid inputs
        return image_name, image_bytes

    return f"{Path(image_name).stem}.jpg", output.getvalue()


def _error_text(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, str) and detail:
        return f"{type(exc).__name__}: {detail}"
    return f"{type(exc).__name__}: {exc}"


async def run_suite(
    cases: Iterable[EvalCase],
    *,
    scorecard_dir: Path = SCORECARD_DIR,
    prefetch: Optional[PrefetchCallable] = None,
    extract: Optional[ExtractCallable] = None,
    clock: Callable[[], float] = time.perf_counter,
) -> SuiteRun:
    """Run each unique image through production OCR once, then grade every case."""
    if prefetch is None or extract is None:
        from api.routers.scan import extract_scan, prefetch_ocr

        prefetch = prefetch or prefetch_ocr
        extract = extract or extract_scan

    grouped: dict[str, list[EvalCase]] = defaultdict(list)
    for case in cases:
        grouped[case.image].append(case)
    if not grouped:
        raise EvalConfigurationError("No runnable cases")

    suite_start = clock()
    results: list[CaseResult] = []
    ocr_seconds_by_image: dict[str, float] = {}

    for image_name, image_cases in grouped.items():
        image_path = scorecard_dir / image_name
        prepared_name, image_bytes = prepare_image_for_upload(
            image_name,
            image_path.read_bytes(),
        )
        ocr_upload = _make_upload(prepared_name, image_bytes)
        ocr_start = clock()
        try:
            response = await prefetch(ocr_upload, current_user=None)
            ocr_seconds = clock() - ocr_start
            ocr_seconds_by_image[image_name] = ocr_seconds
            if not isinstance(response, Mapping):
                raise RuntimeError("OCR prefetch returned an invalid response")
            ocr_text = response.get("ocr_text")
            if not isinstance(ocr_text, str) or not ocr_text.strip():
                raise RuntimeError("OCR prefetch returned empty text")
        except Exception as exc:  # noqa: BLE001 - provider failures belong in the report
            ocr_seconds_by_image[image_name] = clock() - ocr_start
            error = _error_text(exc)
            for case in image_cases:
                results.append(
                    CaseResult(
                        case=case,
                        matched_cells=0,
                        total_cells=case.expected_cells,
                        effective_seconds=ocr_seconds_by_image[image_name],
                        operational_error=f"OCR failed: {error}",
                    )
                )
            continue
        finally:
            await ocr_upload.close()

        for case in image_cases:
            extract_upload = _make_upload(prepared_name, image_bytes)
            extract_start = clock()
            try:
                response = await extract(
                    extract_upload,
                    user_context=case.user_context,
                    course_id=None,
                    ocr_text=ocr_text,
                    db=SimpleNamespace(),
                    current_user=None,
                )
                extraction_seconds = clock() - extract_start
                round_payload = getattr(response, "round", None)
                if not isinstance(round_payload, Mapping):
                    raise RuntimeError("Extraction returned an invalid round payload")
                hole_scores = round_payload.get("hole_scores")
                if not isinstance(hole_scores, list):
                    raise RuntimeError("Extraction returned invalid hole scores")
                results.append(
                    grade_case(
                        case,
                        hole_scores,
                        extraction_seconds=extraction_seconds,
                        effective_seconds=ocr_seconds + extraction_seconds,
                    )
                )
            except Exception as exc:  # noqa: BLE001 - keep evaluating other cases
                extraction_seconds = clock() - extract_start
                results.append(
                    CaseResult(
                        case=case,
                        matched_cells=0,
                        total_cells=case.expected_cells,
                        extraction_seconds=extraction_seconds,
                        effective_seconds=ocr_seconds + extraction_seconds,
                        operational_error=f"Extraction failed: {_error_text(exc)}",
                    )
                )
            finally:
                await extract_upload.close()

    return SuiteRun(
        case_results=results,
        ocr_seconds_by_image=ocr_seconds_by_image,
        suite_seconds=clock() - suite_start,
    )


def _case_status(result: CaseResult) -> str:
    if result.operational_error:
        return "ERROR"
    if result.meets(100):
        return "PERFECT"
    if result.meets(90):
        return "90%+"
    if result.meets(80):
        return "80%+"
    return "FAILED"


def render_report(run: SuiteRun) -> str:
    summary = summarize(run.case_results)
    total_cells = sum(result.total_cells for result in run.case_results)
    matched_cells = sum(result.matched_cells for result in run.case_results)
    lines = [
        "Quick scan evaluation",
        "=" * 72,
        f"{len(run.ocr_seconds_by_image)} images | {summary.total} cases | "
        f"{matched_cells}/{total_cells} numeric cells correct",
        "",
        "Cumulative accuracy",
        f"  {summary.perfect}/{summary.total} were 100% correct",
        f"  {summary.at_least_90}/{summary.total} were 90% or better",
        f"  {summary.at_least_80}/{summary.total} were 80% or better",
        f"  {summary.failed}/{summary.total} failed below 80% or had an operational error",
        "",
        "Cases",
    ]

    for result in run.case_results:
        accuracy = result.accuracy * 100
        lines.append(
            f"  [{_case_status(result):7}] {result.case.case_id}: "
            f"{result.matched_cells}/{result.total_cells} ({accuracy:.1f}%) | "
            f"extract {result.extraction_seconds:.2f}s | effective {result.effective_seconds:.2f}s"
        )
        if result.operational_error:
            lines.append(f"    {result.operational_error}")
        for mismatch in result.mismatches:
            lines.append(
                f"    {mismatch.field_name} hole {mismatch.hole_number}: "
                f"expected {mismatch.expected}, got {mismatch.actual!r}"
            )

    lines.extend(["", "Timing"])
    for image_name, seconds in run.ocr_seconds_by_image.items():
        lines.append(f"  OCR + merge {image_name}: {seconds:.2f}s")

    completed = [result for result in run.case_results if result.operational_error is None]
    if completed:
        effective_times = [result.effective_seconds for result in completed]
        slowest = max(completed, key=lambda result: result.effective_seconds)
        lines.extend(
            [
                f"  Average effective case time: {statistics.mean(effective_times):.2f}s",
                f"  Median effective case time: {statistics.median(effective_times):.2f}s",
                f"  Slowest case: {slowest.case.case_id} ({slowest.effective_seconds:.2f}s)",
            ]
        )
    lines.append(f"  Total suite wall time: {run.suite_seconds:.2f}s")
    return "\n".join(lines)


def exit_code_for_run(run: SuiteRun) -> int:
    """Accuracy failures are informational; only a wholly unusable run fails."""
    return 0 if run.completed_cases > 0 else 2


def _validate_provider_keys() -> None:
    missing = [name for name in ("MISTRAL_API_KEY", "GOOGLE_API_KEY") if not os.environ.get(name)]
    if missing:
        raise EvalConfigurationError(f"Missing required environment variables: {', '.join(missing)}")


def main() -> int:
    load_dotenv(ROOT_DIR / ".env")
    try:
        _validate_provider_keys()
        cases = load_cases()
        run = asyncio.run(run_suite(cases))
    except EvalConfigurationError as exc:
        print(f"Quick scan evaluation could not start: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("Quick scan evaluation interrupted.", file=sys.stderr)
        return 130

    print(render_report(run))
    return exit_code_for_run(run)


if __name__ == "__main__":
    raise SystemExit(main())
