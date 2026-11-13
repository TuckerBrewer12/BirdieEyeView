"""Run a live scorecard accuracy evaluation suite.

Usage:
    python -m scripts.quick_scan_eval
    python -m scripts.quick_scan_eval --suite large

The runner mirrors the production frontend flow: OCR each unique image once,
then pass the prefetched OCR text through the production extract path for each
target player. Accuracy failures are reported but do not fail the process.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import mimetypes
import os
import statistics
import subprocess
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
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
SUITE_MANIFEST_PATHS = {
    "quick": DEFAULT_MANIFEST_PATH,
    "large": SCORECARD_DIR / "scan_eval_cases.json",
}
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
    # A layout the scanner doesn't support yet: still graded, but reported as a known gap.
    known_gap: Optional[str] = None

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
    # Internal scan diagnostics captured from the production logs while this case ran.
    diagnostics: list[str] = field(default_factory=list)

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
    # OCR clean-up and table-merge diagnostics captured from the production logs, per image.
    ocr_diagnostics_by_image: dict[str, list[str]] = field(default_factory=dict)

    @property
    def merge_rejected_images(self) -> int:
        return sum(
            any("table merge rejected" in line or "table merge failed" in line for line in lines)
            for lines in self.ocr_diagnostics_by_image.values()
        )

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
        # `user_context` is exactly what the app would send. People-only remarks go in `notes`,
        # which the scanner never sees; `known_gap` names an unsupported layout.
        for optional in ("notes", "known_gap"):
            if optional in raw and (not isinstance(raw[optional], str) or not raw[optional].strip()):
                raise EvalConfigurationError(f"{label}: {optional} must be a non-empty string when present")

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
                known_gap=raw.get("known_gap"),
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


class _DiagnosticsCapture(logging.Handler):
    """Collect the scan pipeline's internal diagnostics lines while a case runs."""

    LOGGERS = ("api.routers.scan", "services.gemini_table_merger")

    def __init__(self) -> None:
        super().__init__(level=logging.INFO)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        if not record.name.startswith(self.LOGGERS):
            return
        message = record.getMessage()
        if "Scan diagnostics" in message:
            _stage, _, body = message.partition("): ")
            self.lines.extend(part.strip() for part in body.split(" | ") if part.strip() and part.strip() != "none")
        elif "table merge" in message:
            self.lines.append(message)

    def take(self) -> list[str]:
        lines, self.lines = self.lines, []
        return lines


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
    ocr_diagnostics_by_image: dict[str, list[str]] = {}
    capture = _DiagnosticsCapture()
    root = logging.getLogger()
    root.addHandler(capture)
    previous_levels = {name: logging.getLogger(name).level for name in capture.LOGGERS}
    for name in capture.LOGGERS:
        if not logging.getLogger(name).isEnabledFor(logging.INFO):
            logging.getLogger(name).setLevel(logging.INFO)

    try:
        return await _run_grouped(
            grouped, scorecard_dir, prefetch, extract, clock, suite_start,
            results, ocr_seconds_by_image, ocr_diagnostics_by_image, capture,
        )
    finally:
        root.removeHandler(capture)
        for name, level in previous_levels.items():
            logging.getLogger(name).setLevel(level)


async def _run_grouped(
    grouped: dict[str, list[EvalCase]],
    scorecard_dir: Path,
    prefetch: PrefetchCallable,
    extract: ExtractCallable,
    clock: Callable[[], float],
    suite_start: float,
    results: list[CaseResult],
    ocr_seconds_by_image: dict[str, float],
    ocr_diagnostics_by_image: dict[str, list[str]],
    capture: _DiagnosticsCapture,
) -> SuiteRun:
    for image_name, image_cases in grouped.items():
        image_path = scorecard_dir / image_name
        prepared_name, image_bytes = prepare_image_for_upload(
            image_name,
            image_path.read_bytes(),
        )
        ocr_upload = _make_upload(prepared_name, image_bytes)
        ocr_start = clock()
        capture.take()
        try:
            response = await prefetch(ocr_upload, current_user=None)
            ocr_seconds = clock() - ocr_start
            ocr_seconds_by_image[image_name] = ocr_seconds
            ocr_diagnostics_by_image[image_name] = capture.take()
            if not isinstance(response, Mapping):
                raise RuntimeError("OCR prefetch returned an invalid response")
            ocr_text = response.get("ocr_text")
            if not isinstance(ocr_text, str) or not ocr_text.strip():
                raise RuntimeError("OCR prefetch returned empty text")
        except Exception as exc:  # noqa: BLE001 - provider failures belong in the report
            ocr_seconds_by_image[image_name] = clock() - ocr_start
            ocr_diagnostics_by_image[image_name] = capture.take()
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
            capture.take()
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
                graded = grade_case(
                    case,
                    hole_scores,
                    extraction_seconds=extraction_seconds,
                    effective_seconds=ocr_seconds + extraction_seconds,
                )
                graded.diagnostics = capture.take()
                results.append(graded)
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
                        diagnostics=capture.take(),
                    )
                )
            finally:
                await extract_upload.close()

    return SuiteRun(
        case_results=results,
        ocr_seconds_by_image=ocr_seconds_by_image,
        suite_seconds=clock() - suite_start,
        ocr_diagnostics_by_image=ocr_diagnostics_by_image,
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


def render_report(run: SuiteRun, *, suite: str = "quick") -> str:
    summary = summarize(run.case_results)
    total_cells = sum(result.total_cells for result in run.case_results)
    matched_cells = sum(result.matched_cells for result in run.case_results)
    lines = [
        f"{suite.capitalize()} scan evaluation",
        "=" * 72,
        f"{len(run.ocr_seconds_by_image)} images | {summary.total} cases | "
        f"{matched_cells}/{total_cells} numeric cells correct",
        "",
        "Cumulative accuracy",
        f"  {summary.perfect}/{summary.total} were 100% correct",
        f"  {summary.at_least_90}/{summary.total} were 90% or better",
        f"  {summary.at_least_80}/{summary.total} were 80% or better",
        f"  {summary.failed}/{summary.total} failed below 80% or had an operational error",
        f"  {summary.total - run.completed_cases}/{summary.total} had an operational error",
        f"  {sum(1 for r in run.case_results if r.case.known_gap)}/{summary.total} are known scanner gaps",
        f"  {run.merge_rejected_images}/{len(run.ocr_seconds_by_image)} images had the table merge rejected",
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
        if result.case.known_gap:
            lines.append(f"    KNOWN GAP: {result.case.known_gap}")
        if result.operational_error:
            lines.append(f"    {result.operational_error}")
        for mismatch in result.mismatches:
            lines.append(
                f"    {mismatch.field_name} hole {mismatch.hole_number}: "
                f"expected {mismatch.expected}, got {mismatch.actual!r}"
            )
        for line in [*run.ocr_diagnostics_by_image.get(result.case.image, []), *result.diagnostics]:
            lines.append(f"    - {line}")

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


def results_metadata(environment=None):
    """Metadata for the tested checkout, independent of the mutable PR head ref."""
    environment = os.environ if environment is None else environment
    now = datetime.now(timezone.utc)

    def git(*args):
        try:
            result = subprocess.run(["git", *args], cwd=ROOT_DIR, capture_output=True, text=True, check=False)
        except OSError:
            return None
        return result.stdout.strip() if result.returncode == 0 else None

    from api.routers.scan import MISTRAL_OCR_MODEL
    from services.gemini_table_merger import GEMINI_MERGE_MODEL

    state = git("status", "--porcelain", "--untracked-files=normal", "--", "api", "services", "scripts", "models", "analytics", "database")
    return {
        "dirty": None if state is None else bool(state),
        "id": environment.get("SCAN_EVAL_RUN_ID") or "local-" + now.strftime("%Y%m%dT%H%M%S%fZ"),
        "suite": environment.get("SCAN_EVAL_SUITE", "quick"),
        "created_at": now.isoformat(timespec="microseconds").replace("+00:00", "Z"),
        "branch": environment.get("SCAN_EVAL_BRANCH") or git("branch", "--show-current") or None,
        "commit": environment.get("SCAN_EVAL_COMMIT") or git("rev-parse", "HEAD"),
        "head_commit": environment.get("SCAN_EVAL_HEAD_COMMIT") or None,
        "pr": int(environment["SCAN_EVAL_PR"]) if environment.get("SCAN_EVAL_PR") else None,
        "run_url": environment.get("SCAN_EVAL_RUN_URL") or None,
        "models": {"ocr": MISTRAL_OCR_MODEL, "merge": GEMINI_MERGE_MODEL},
    }


def results_payload(run, *, suite, metadata, scorecard_dir=SCORECARD_DIR):
    """Export existing grading outcomes; the archive validator reconciles all aggregates."""
    import hashlib
    from scripts.eval_results import validate

    def short(value):
        return value if value is None or len(value) <= 500 else value[:497] + "..."

    def lines(values):
        bounded = [short(value) for value in values[:200]]
        if len(values) > 200:
            bounded[-1] = "Additional diagnostics omitted (export limit)."
        return bounded

    cases = []
    for result in run.case_results:
        case = result.case
        digest = hashlib.sha256((Path(scorecard_dir) / case.image).read_bytes())
        digest.update(json.dumps({"expected": case.expected, "user_context": case.user_context,
                                  "player": case.player_name, "source_score_format": case.source_score_format},
                                 sort_keys=True, separators=(",", ":")).encode())
        cases.append({
            "id": case.case_id, "image": case.image, "player": case.player_name,
            "fingerprint": digest.hexdigest(), "status": _case_status(result),
            "matched_cells": result.matched_cells, "total_cells": result.total_cells,
            "known_gap": short(case.known_gap), "operational_error": short(result.operational_error),
            "extraction_seconds": result.extraction_seconds, "effective_seconds": result.effective_seconds,
            "mismatches": [{"field": m.field_name, "hole": m.hole_number, "expected": m.expected,
                            "actual": m.actual} for m in result.mismatches],
            "diagnostics": lines(result.diagnostics),
        })
    summary = summarize(run.case_results)
    payload = {
        "schema_version": 1, "run": {**metadata, "suite": suite},
        "summary": {
            "images": len(run.ocr_seconds_by_image), "cases": summary.total,
            "matched_cells": sum(r.matched_cells for r in run.case_results),
            "total_cells": sum(r.total_cells for r in run.case_results),
            "perfect": summary.perfect, "at_least_90": summary.at_least_90,
            "at_least_80": summary.at_least_80, "failed": summary.failed,
            "operational_errors": summary.total - run.completed_cases,
            "known_gaps": sum(bool(r.case.known_gap) for r in run.case_results),
            "merge_rejected_images": run.merge_rejected_images, "suite_seconds": run.suite_seconds,
        },
        "images": [{"image": image, "ocr_seconds": seconds,
                    "diagnostics": lines(run.ocr_diagnostics_by_image.get(image, []))}
                   for image, seconds in run.ocr_seconds_by_image.items()],
        "cases": cases,
    }
    return validate(payload)


def redact_payload(value, secrets):
    """Redact decoded string values, so secret characters cannot corrupt JSON syntax."""
    if isinstance(value, str):
        for secret in secrets:
            if secret:
                value = value.replace(secret, "[REDACTED]")
        return value
    if isinstance(value, list):
        return [redact_payload(item, secrets) for item in value]
    if isinstance(value, dict):
        return {key: redact_payload(item, secrets) for key, item in value.items()}
    return value


def render_markdown(run=None, payload=None):
    """Readable Actions summary. Only fixed markup is HTML; all report text is escaped."""
    import html

    if payload is None:
        payload = run

    def escape(value):
        text = html.escape(str(value), quote=True)
        for char in "|`[]()@#*_~!":
            text = text.replace(char, "&#" + str(ord(char)) + ";")
        return text.replace("\r", " ").replace("\n", "<br>")

    info = payload["run"]
    lines = [f"# {info['suite'].capitalize()} scan evaluation", "",
             "Branch: " + escape(info["branch"] or "unknown"), "",
             "Tested commit: " + escape(info["commit"] or "unknown"), "",
             "Working tree: " + ({True: "modified", False: "clean", None: "unknown"}[info["dirty"]]), "",
             "Models: " + escape(info["models"]["ocr"]) + " / " + escape(info["models"]["merge"]), "",
             "| Metric | Value |", "| --- | ---: |"]
    lines += ["| " + escape(key.replace("_", " ")) + " | " + escape(value) + " |"
              for key, value in payload["summary"].items()]
    lines += ["", "## Cases", "", "| Status | Case | Cells | Accuracy | Time |", "| --- | --- | ---: | ---: | ---: |"]
    for case in payload["cases"]:
        percentage = 100 * case["matched_cells"] / case["total_cells"]
        lines.append("| " + " | ".join([escape(case["status"]), escape(case["id"]),
                     f"{case['matched_cells']}/{case['total_cells']}", f"{percentage:.1f}%",
                     f"{case['effective_seconds']:.2f}s"]) + " |")
    for case in payload["cases"]:
        block = []
        if case["status"] == "PERFECT" and not case["known_gap"]:
            continue
        block += ["", "<details>", "<summary>" + escape(case["id"]) + "</summary>", ""]
        for value in (case["known_gap"], case["operational_error"]):
            if value:
                block += [escape(value), ""]
        for cell in case["mismatches"]:
            block.append("- " + escape(f"{cell['field']} hole {cell['hole']}: expected {cell['expected']}, got {cell['actual']}"))
        image = next(image for image in payload["images"] if image["image"] == case["image"])
        for line in [*image["diagnostics"], *case["diagnostics"]][:40]:
            block.append("- " + escape(line))
        if len(image["diagnostics"]) + len(case["diagnostics"]) > 40:
            block.append("- Additional diagnostics are in results.json.")
        block += ["", "</details>"]
        if len(("\n".join(lines + block)).encode("utf-8")) > 900_000:
            lines += ["", "Further case details are available in the structured results artifact."]
            break
        lines.extend(block)
    return "\n".join(lines) + "\n"


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run a live scorecard scan evaluation.")
    parser.add_argument("--suite", choices=SUITE_MANIFEST_PATHS, default="quick")
    parser.add_argument("--results-json", type=Path)
    parser.add_argument("--summary-markdown", type=Path)
    args = parser.parse_args(argv)
    suite = args.suite
    load_dotenv(ROOT_DIR / ".env")
    try:
        _validate_provider_keys()
        cases = load_cases(SUITE_MANIFEST_PATHS[suite])
        run = asyncio.run(run_suite(cases))
    except EvalConfigurationError as exc:
        print(f"{suite.capitalize()} scan evaluation could not start: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print(f"{suite.capitalize()} scan evaluation interrupted.", file=sys.stderr)
        return 130

    print(render_report(run, suite=suite))
    if args.results_json or args.summary_markdown:
        from scripts.eval_results import ResultsError, encode
        try:
            payload = results_payload(run, suite=suite, metadata=results_metadata())
            payload = redact_payload(payload, [os.environ.get(key) for key in ("MISTRAL_API_KEY", "GOOGLE_API_KEY")])
            if args.results_json:
                args.results_json.parent.mkdir(parents=True, exist_ok=True)
                args.results_json.write_bytes(encode(payload))
            if args.summary_markdown:
                args.summary_markdown.parent.mkdir(parents=True, exist_ok=True)
                args.summary_markdown.write_text(render_markdown(payload), encoding="utf-8")
        except (ResultsError, OSError, ValueError) as error:
            # The scan results above are still valid; only the structured copy is skipped.
            print(f"Warning: structured results not exported: {error}", file=sys.stderr)
            for path in (args.results_json, args.summary_markdown):
                if path:
                    path.unlink(missing_ok=True)
    return exit_code_for_run(run)


if __name__ == "__main__":
    raise SystemExit(main())
