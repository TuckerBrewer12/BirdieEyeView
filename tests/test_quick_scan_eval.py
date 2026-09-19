import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from scripts.quick_scan_eval import (
    CaseResult,
    CellMismatch,
    EvalCase,
    EvalConfigurationError,
    SuiteRun,
    exit_code_for_run,
    grade_case,
    load_cases,
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


def test_committed_manifest_defines_four_cases_and_expected_cell_counts():
    cases = load_cases()

    assert [case.case_id for case in cases] == [
        "half_moon_bay_g",
        "half_moon_bay_t",
        "blue_rock_tucker",
        "eagle_vines_tucker",
    ]
    assert [case.expected_cells for case in cases] == [54, 54, 18, 18]
    half_moon_bay_t = next(case for case in cases if case.case_id == "half_moon_bay_t")
    assert half_moon_bay_t.expected["shots_to_green"][14] == 5


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
    assert "strokes hole 8: expected 4, got None" in report
    assert "OCR failed: timeout" in report
    assert "OCR + merge card.png: 2.25s" in report
    assert "Total suite wall time: 7.00s" in report


@pytest.mark.asyncio
async def test_runner_scans_shared_image_once_and_extracts_each_case(tmp_path):
    image_path = tmp_path / "card.png"
    image_path.write_bytes(b"image bytes")
    cases = [make_case("first"), make_case("second")]
    calls = {"prefetch": 0, "extract": 0}

    async def fake_prefetch(upload, *, current_user):
        calls["prefetch"] += 1
        assert upload.filename == "card.png"
        assert current_user is None
        return {"ocr_text": "merged markdown"}

    async def fake_extract(upload, **kwargs):
        calls["extract"] += 1
        assert upload.filename == "card.png"
        assert kwargs["ocr_text"] == "merged markdown"
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

    assert calls == {"prefetch": 1, "extract": 2}
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
