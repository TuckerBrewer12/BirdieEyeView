import json
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from PIL import Image

import scripts.quick_scan_eval as quick_eval
from scripts.quick_scan_eval import (
    CaseResult,
    CellMismatch,
    EvalCase,
    EvalConfigurationError,
    SuiteRun,
    exit_code_for_run,
    grade_case,
    load_cases,
    prepare_image_for_upload,
    render_report,
    run_suite,
    summarize,
)


def make_case(case_id="case", image="card.png", fields=("strokes",)):
    expected = {field: {hole: hole + index for hole in range(1, 19)} for index, field in enumerate(fields)}
    return EvalCase(
        case_id=case_id,
        image=image,
        player_name="Player",
        source_score_format="raw_strokes",
        user_context="my name is Player. final scores only.",
        expected=expected,
    )


def make_result(case_id, matched, total=10, *, error=None):
    return CaseResult(
        case=make_case(case_id),
        matched_cells=matched,
        total_cells=total,
        operational_error=error,
    )


@pytest.mark.parametrize(
    "manifest_path", quick_eval.SUITE_MANIFEST_PATHS.values(), ids=tuple(quick_eval.SUITE_MANIFEST_PATHS),
)
def test_every_committed_case_loads_with_its_image_and_full_hole_coverage(manifest_path):
    cases = load_cases(manifest_path)

    assert cases and len({case.case_id for case in cases}) == len(cases)
    for case in cases:
        assert (quick_eval.SCORECARD_DIR / case.image).is_file(), case.case_id
        assert case.expected and case.expected_cells == 18 * len(case.expected), case.case_id


@pytest.mark.parametrize(
    ("argv", "manifest_name", "suite"),
    [
        ([], "quick_eval_cases.json", "Quick"),
        (["--suite", "quick"], "quick_eval_cases.json", "Quick"),
        (["--suite", "large"], "scan_eval_cases.json", "Large"),
    ],
)
def test_main_selects_requested_suite(argv, manifest_name, suite, monkeypatch, capsys):
    expected_cases = load_cases(quick_eval.SCORECARD_DIR / manifest_name)

    async def fake_run_suite(cases):
        assert cases == expected_cases
        return SuiteRun([make_result("example", 0)], {"card.png": 0.1}, 0.2)

    monkeypatch.setattr(quick_eval, "load_dotenv", lambda *args: None)
    monkeypatch.setattr(quick_eval, "run_suite", fake_run_suite)
    monkeypatch.setenv("MISTRAL_API_KEY", "test-mistral")
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google")

    assert quick_eval.main(argv) == 0
    assert capsys.readouterr().out.startswith(f"{suite} scan evaluation\n")


def test_manifest_requires_complete_hole_coverage(tmp_path):
    scorecard_dir = tmp_path / "cards"
    scorecard_dir.mkdir()
    (scorecard_dir / "card.png").write_bytes(b"image")
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "version": 1,
                "cases": [
                    {
                        "id": "incomplete",
                        "image": "card.png",
                        "player_name": "Player",
                        "source_score_format": "raw_strokes",
                        "user_context": "my name is Player",
                        "expected": {"strokes": {"1": 4}},
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(EvalConfigurationError, match="must define holes 1-18"):
        load_cases(manifest_path, scorecard_dir=scorecard_dir)


def test_grader_matches_by_field_and_hole_number():
    case = make_case(fields=("strokes", "putts"))
    actual = [
        {"hole_number": hole, "strokes": hole, "putts": hole + 1}
        for hole in reversed(range(1, 19))
    ]
    actual[0].pop("strokes")
    actual[1]["strokes"] = 999

    result = grade_case(case, actual)

    assert (result.matched_cells, result.total_cells) == (34, 36)
    assert result.mismatches == [
        CellMismatch(field_name="strokes", hole_number=17, expected=17, actual=999),
        CellMismatch(field_name="strokes", hole_number=18, expected=18, actual=None),
    ]


def test_prepare_image_for_upload_matches_ui_policy():
    source = BytesIO()
    Image.new("RGBA", (2400, 1200), (255, 255, 255, 128)).save(source, format="PNG")

    prepared_name, prepared_bytes = prepare_image_for_upload(
        "scorecard.png",
        source.getvalue(),
    )

    assert prepared_name == "scorecard.jpg"
    with Image.open(BytesIO(prepared_bytes)) as prepared:
        assert prepared.format == "JPEG"
        assert prepared.mode == "RGB"
        assert max(prepared.size) == 2000
    assert quick_eval.EVAL_UPLOAD_QUALITY == 80


def test_summary_buckets_are_cumulative_and_errors_fail():
    results = [
        make_result("perfect", 10),
        make_result("ninety", 9),
        make_result("eighty", 8),
        make_result("below", 7),
        make_result("error", 10, error="provider unavailable"),
    ]

    summary = summarize(results)

    assert (summary.total, summary.perfect) == (5, 1)
    assert (summary.at_least_90, summary.at_least_80, summary.failed) == (2, 3, 2)


def write_manifest(tmp_path, **extra):
    scorecard_dir = tmp_path / "cards"
    scorecard_dir.mkdir(exist_ok=True)
    (scorecard_dir / "card.png").write_bytes(b"image")
    case = {
        "id": "case", "image": "card.png", "player_name": "Player", "source_score_format": "raw_strokes",
        "user_context": "my name is Player", "expected": {"strokes": {str(h): 4 for h in range(1, 19)}}, **extra,
    }
    manifest_path = tmp_path / "manifest.json"
    manifest_path.write_text(json.dumps({"version": 1, "cases": [case]}), encoding="utf-8")
    return manifest_path, scorecard_dir


def test_notes_stay_out_of_the_scan_and_known_gaps_load(tmp_path):
    manifest_path, scorecard_dir = write_manifest(tmp_path, notes="Initial may look like G.", known_gap="No score row.")

    [case] = load_cases(manifest_path, scorecard_dir=scorecard_dir)

    assert case.known_gap == "No score row."
    assert "Initial" not in case.user_context


@pytest.mark.parametrize("field", ["notes", "known_gap"])
@pytest.mark.parametrize("value", ["", "   ", 3, None])
def test_notes_and_known_gap_must_be_text(tmp_path, field, value):
    manifest_path, scorecard_dir = write_manifest(tmp_path, **{field: value})

    with pytest.raises(EvalConfigurationError, match=f"{field} must be a non-empty string"):
        load_cases(manifest_path, scorecard_dir=scorecard_dir)


def test_report_marks_and_counts_known_gaps():
    gap = make_result("lake_chabot_g", 0, error="Extraction failed: no score rows")
    gap.case = EvalCase(**{**gap.case.__dict__, "known_gap": "The card has no final score row."})
    run = SuiteRun(case_results=[make_result("ok", 10), gap], ocr_seconds_by_image={"card.png": 1.0}, suite_seconds=2.0)

    report = render_report(run)

    assert "1/2 are known scanner gaps" in report
    assert "KNOWN GAP: The card has no final score row." in report


def test_report_includes_cumulative_counts_mismatches_errors_and_timing():
    failed = make_result("failed_case", 7)
    failed.mismatches = [CellMismatch("strokes", 8, 4, None)]
    failed.extraction_seconds = 1.25
    failed.effective_seconds = 3.5
    errored = make_result("errored_case", 0, error="OCR failed: timeout")
    run = SuiteRun(
        case_results=[make_result("perfect_case", 10), failed, errored],
        ocr_seconds_by_image={"card.png": 2.25},
        suite_seconds=7.0,
    )

    report = render_report(run)

    assert "1/3 were 100% correct" in report
    assert "1/3 were 90% or better" in report
    assert "2/3 failed below 80% or had an operational error" in report
    assert "1/3 had an operational error" in report
    assert "0/3 are known scanner gaps" in report
    assert "strokes hole 8: expected 4, got None" in report
    assert "OCR failed: timeout" in report
    assert "OCR + merge card.png: 2.25s" in report
    assert "Total suite wall time: 7.00s" in report


@pytest.mark.asyncio
async def test_runner_prepares_shared_image_once_and_reuses_bytes(monkeypatch, tmp_path):
    image_path = tmp_path / "card.png"
    Image.new("RGB", (1200, 800), "white").save(image_path)
    cases = [make_case("first"), make_case("second")]
    calls = {"prepare": 0, "prefetch": 0, "extract": 0}
    uploaded_payloads = []
    real_prepare = quick_eval.prepare_image_for_upload

    def counted_prepare(image_name, image_bytes):
        calls["prepare"] += 1
        return real_prepare(image_name, image_bytes)

    monkeypatch.setattr(quick_eval, "prepare_image_for_upload", counted_prepare)

    async def fake_prefetch(upload, *, current_user):
        calls["prefetch"] += 1
        assert upload.filename == "card.jpg"
        assert current_user is None
        uploaded_payloads.append(upload.file.read())
        return {"ocr_text": "merged markdown"}

    async def fake_extract(upload, **kwargs):
        calls["extract"] += 1
        assert upload.filename == "card.jpg"
        assert kwargs["ocr_text"] == "merged markdown"
        uploaded_payloads.append(upload.file.read())
        return SimpleNamespace(
            round={
                "hole_scores": [
                    {"hole_number": hole, "strokes": hole}
                    for hole in range(1, 19)
                ]
            }
        )

    run = await run_suite(
        cases,
        scorecard_dir=tmp_path,
        prefetch=fake_prefetch,
        extract=fake_extract,
    )

    assert calls == {"prepare": 1, "prefetch": 1, "extract": 2}
    assert len(set(uploaded_payloads)) == 1
    with Image.open(BytesIO(uploaded_payloads[0])) as prepared:
        assert (prepared.format, max(prepared.size)) == ("JPEG", 1200)
    assert [result.matched_cells for result in run.case_results] == [18, 18]


@pytest.mark.asyncio
async def test_runner_reports_one_image_error_for_all_dependent_cases(tmp_path):
    (tmp_path / "card.png").write_bytes(b"image bytes")
    cases = [make_case("first"), make_case("second")]

    async def failed_prefetch(*args, **kwargs):
        raise RuntimeError("provider timeout")

    async def unused_extract(*args, **kwargs):
        raise AssertionError("extract should not run")

    run = await run_suite(
        cases,
        scorecard_dir=tmp_path,
        prefetch=failed_prefetch,
        extract=unused_extract,
    )

    assert run.completed_cases == 0
    assert all("provider timeout" in (result.operational_error or "") for result in run.case_results)


def test_accuracy_failure_does_not_fail_process_but_unusable_run_does():
    accuracy_failure = SuiteRun(
        case_results=[make_result("failed", 0)],
        ocr_seconds_by_image={"card.png": 1.0},
        suite_seconds=1.0,
    )
    unusable = SuiteRun(
        case_results=[make_result("error", 0, error="provider unavailable")],
        ocr_seconds_by_image={"card.png": 1.0},
        suite_seconds=1.0,
    )

    assert exit_code_for_run(accuracy_failure) == 0
    assert exit_code_for_run(unusable) == 2
