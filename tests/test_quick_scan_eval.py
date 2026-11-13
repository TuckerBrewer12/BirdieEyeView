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
    # Growth-proof: adding scorecards to the manifest needs no change here.
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
    assert "Initial" not in case.user_context  # notes are for people, never sent to the scanner


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


def test_report_shows_scan_diagnostics_under_each_case_and_counts_rejected_merges():
    errored = make_result("errored_case", 0, error="Extraction failed: unreadable")
    errored.diagnostics = ["no row labeled 'D' with hole values (0 label match(es)) among 9 table rows"]
    run = SuiteRun(
        case_results=[make_result("perfect_case", 10), errored],
        ocr_seconds_by_image={"card.png": 2.25, "other.png": 1.0},
        suite_seconds=7.0,
        ocr_diagnostics_by_image={
            "card.png": ["ocr table 0: expanded 2 merged cell(s) into the grid", "table merge rejected: line 7 has 23 columns, expected 22"],
            "other.png": ["table merge accepted"],
        },
    )

    report = render_report(run)

    assert "1/2 images had the table merge rejected" in report
    assert "    - table merge rejected: line 7 has 23 columns, expected 22" in report
    assert "    - no row labeled 'D' with hole values" in report


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


# Structured export is CLI-only behavior (3b), separate from live provider calls.
def test_results_export_and_markdown_use_existing_grading(tmp_path):
    from scripts.eval_results import validate
    fixture = tmp_path/'card.png'
    fixture.write_bytes(b'fixture pixels')
    cases = [make_case('perfect'), make_case('wrong'), make_case('error')]
    perfect = grade_case(cases[0], [{'hole_number':n,'strokes':n} for n in range(1,19)])
    wrong = grade_case(cases[1], [{'hole_number':n,'strokes':n if n>2 else None} for n in range(1,19)])
    error = CaseResult(cases[2],0,18,operational_error='Timeout <script>|` @owner\n[next](https://bad.invalid)')
    error.diagnostics = ['a'*600]
    run = SuiteRun([perfect,wrong,error],{'card.png':1.2},2.4)
    meta = quick_eval.results_metadata({})
    result = quick_eval.results_payload(run,suite='large',metadata=meta,scorecard_dir=tmp_path)
    validate(result)
    assert result['summary']['matched_cells'] == 34
    assert result['summary']['operational_errors'] == 1
    assert len(result['cases'][2]['diagnostics'][0]) == 500
    report = quick_eval.render_markdown(result)
    assert '<script>' not in report and '@owner' not in report and '[next]' not in report
    assert 'PERFECT' in report and 'ERROR' in report and '34' in report
    changed = quick_eval.results_payload(run,suite='large',metadata=meta,scorecard_dir=tmp_path)
    assert changed['cases'][0]['fingerprint'] == result['cases'][0]['fingerprint']
    fixture.write_bytes(b'different fixture')
    changed = quick_eval.results_payload(run,suite='large',metadata=meta,scorecard_dir=tmp_path)
    assert changed['cases'][0]['fingerprint'] != result['cases'][0]['fingerprint']


def test_metadata_and_redaction_preserve_json_special_characters():
    meta = quick_eval.results_metadata({'SCAN_EVAL_RUN_ID':'123-2','SCAN_EVAL_BRANCH':'feature',
        'SCAN_EVAL_COMMIT':'a'*40,'SCAN_EVAL_HEAD_COMMIT':'b'*40,'SCAN_EVAL_PR':'650',
        'SCAN_EVAL_RUN_URL':'https://github.com/TuckerBrewer12/BirdieEyeView/actions/runs/123'})
    assert (meta['id'],meta['commit'],meta['head_commit'],meta['pr']) == ('123-2','a'*40,'b'*40,650)
    secret = 'key"with\\special'
    redacted = quick_eval.redact_payload({'diagnostics':[secret+' message']},[secret])
    assert json.loads(json.dumps(redacted)) == {'diagnostics':['[REDACTED] message']}


def test_main_writes_structured_outputs_without_live_calls(monkeypatch,tmp_path,capsys):
    case = make_case(image='card.png')
    (tmp_path/'card.png').write_bytes(b'fixture')
    result = grade_case(case,[{'hole_number':n,'strokes':n} for n in range(1,19)])
    async def fake_run(cases):
        return SuiteRun([result],{'card.png':1.0},2.0)
    original_export = quick_eval.results_payload
    monkeypatch.setattr(quick_eval,'results_payload',lambda *a,**kw: original_export(*a,**kw,scorecard_dir=tmp_path))
    monkeypatch.setattr(quick_eval,'run_suite',fake_run)
    monkeypatch.setattr(quick_eval,'load_cases',lambda *args: [case])
    monkeypatch.setattr(quick_eval,'load_dotenv',lambda *args: None)
    monkeypatch.setenv('MISTRAL_API_KEY','fake-key-mistral')
    monkeypatch.setenv('GOOGLE_API_KEY','fake-key-google')
    assert quick_eval.main(['--results-json',str(tmp_path/'r.json'),'--summary-markdown',str(tmp_path/'summary.md')]) == 0
    assert json.loads((tmp_path/'r.json').read_text())['summary']['perfect'] == 1
    assert 'Quick scan evaluation' in (tmp_path/'summary.md').read_text()
    assert 'Quick scan evaluation' in capsys.readouterr().out


def test_local_metadata_without_git_is_explicitly_unknown(monkeypatch):
    def no_git(*args,**kwargs):
        raise FileNotFoundError('git is unavailable')
    monkeypatch.setattr(quick_eval.subprocess,'run',no_git)
    meta=quick_eval.results_metadata({})
    assert meta['id'].startswith('local-')
    assert meta['branch'] is None and meta['commit'] is None and meta['dirty'] is None


def test_failed_structured_export_warns_but_keeps_the_eval_exit_code(monkeypatch, tmp_path, capsys):
    from scripts.eval_results import ResultsError

    case = make_case(image='card.png')
    result = grade_case(case, [{'hole_number': n, 'strokes': n} for n in range(1, 19)])

    async def fake_run(cases):
        return SuiteRun([result], {'card.png': 1.0}, 2.0)

    def broken_export(*args, **kwargs):
        raise ResultsError('Invalid run.run_url')

    stale = tmp_path / 'r.json'
    stale.write_text('{"left": "over"}')
    monkeypatch.setattr(quick_eval, 'results_payload', broken_export)
    monkeypatch.setattr(quick_eval, 'run_suite', fake_run)
    monkeypatch.setattr(quick_eval, 'load_cases', lambda *args: [case])
    monkeypatch.setattr(quick_eval, 'load_dotenv', lambda *args: None)
    monkeypatch.setenv('MISTRAL_API_KEY', 'fake-key-mistral')
    monkeypatch.setenv('GOOGLE_API_KEY', 'fake-key-google')

    assert quick_eval.main(['--results-json', str(stale)]) == 0  # the scan results still count
    captured = capsys.readouterr()
    assert 'Quick scan evaluation' in captured.out
    assert 'Warning: structured results not exported: Invalid run.run_url' in captured.err
    assert not stale.exists()  # a stale file from an earlier run is never uploaded as this run
