from pathlib import Path

import pytest

from models import Course, Hole, Tee
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow, parse_mistral_scorecard_rows
from services.scan_assembly import assemble_scan, confidence_level, scan_confidence


@pytest.mark.parametrize(
    ("score", "expected"),
    [(0.9, "high"), (0.7, "medium"), (0.5, "low"), (0.1, "very_low")],
)
def test_confidence_level_maps_score(score, expected):
    assert confidence_level(score) == expected


def test_confidence_payload_scores_complete_and_missing_holes():
    payload = scan_confidence(
        [
            {"hole_number": 1, "strokes": 4, "putts": 2, "green_in_regulation": True},
            {"hole_number": 2, "strokes": None, "putts": None, "green_in_regulation": None},
        ],
        ["review"],
    )

    assert payload["overall"] == pytest.approx(0.48)
    assert (
        payload["hole_scores"][0]["fields"]["strokes"]["level"],
        payload["hole_scores"][1]["level"],
    ) == ("high", "very_low")


def test_confidence_payload_without_holes_has_zero_confidence():
    assert scan_confidence([], ["warning"])["overall"] == 0


def make_known_course_rows():
    course = Course(
        name="Pebble Beach",
        location="Monterey",
        holes=[
            Hole(number=1, par=4, handicap=1),
            Hole(number=2, par=3, handicap=18),
            Hole(number=3, par=None),
        ],
        tees=[
            Tee(
                color="Blue",
                slope_rating=125,
                course_rating=72,
                hole_yardages={1: 400},
            )
        ],
    )
    parsed = ParsedScorecardRows(
        score_row=[0, 20, 1],
        putts_row=[2, 11, 3],
        shots_to_green_row=[2, 0, 11],
        gir_row=[None, None, None],
        score_to_par_hint=True,
        warnings=["existing warning"],
    )
    assembly = assemble_scan(parsed, course=course, to_par_scoring=None)
    return assembly.round, assembly.notes


def test_known_course_round_preserves_course_metadata():
    payload, _ = make_known_course_rows()

    assert payload["course"]["name"] == "Pebble Beach"
    assert payload["course"]["tees"][0]["hole_yardages"] == {"1": 400}


def test_known_course_round_guards_invalid_scores():
    payload, _ = make_known_course_rows()

    assert (
        payload["hole_scores"][0]["strokes"],
        payload["hole_scores"][0]["green_in_regulation"],
    ) == (4, True)
    assert (
        payload["hole_scores"][1]["strokes"],
        payload["hole_scores"][1]["putts"],
    ) == (None, None)
    assert (
        payload["hole_scores"][2]["strokes"],
        payload["hole_scores"][2]["shots_to_green"],
    ) == (None, None)


def test_known_course_round_preserves_and_adds_warnings():
    _, warnings = make_known_course_rows()

    assert "existing warning" in warnings
    assert any("without known par" in warning for warning in warnings)


def test_build_round_works_out_greens_from_strokes_and_putts_without_a_shots_row():
    parsed = ParsedScorecardRows(
        par_row=[4, 4, 3, 5],
        score_row=[4, 6, 3, None],
        putts_row=[2, 2, None, 2],
        gir_row=[None, None, None, False],
    )

    payload = assemble_scan(parsed, course=None, to_par_scoring=False).round

    greens = [hole["green_in_regulation"] for hole in payload["hole_scores"][:4]]
    assert greens == [True, False, None, False]


def make_unknown_course_rows():
    parsed = ParsedScorecardRows(
        par_row=[4] * 9 + [7],
        handicap_row=list(range(1, 11)),
        tee_rows=[ParsedTeeRow(label="Gold", yardages=[400, None, 180])],
        score_row=[4, None, 2],
        putts_row=[5, 2, 1],
        shots_to_green_row=[2, 2, 2],
    )
    assembly = assemble_scan(parsed, course=None, to_par_scoring=False)
    return assembly.round, assembly.notes


def test_unknown_course_round_builds_ocr_course_metadata():
    payload, _ = make_unknown_course_rows()

    assert (payload["course"]["name"], payload["course"]["par"]) == (None, 36)
    assert payload["course"]["holes"][9]["par"] is None
    assert payload["course"]["tees"][0]["hole_yardages"] == {"1": 400, "3": 180}


def test_unknown_course_round_warns_about_invalid_scores():
    payload, warnings = make_unknown_course_rows()

    assert payload["hole_scores"][0]["putts"] is None
    assert any("putts exceed strokes" in warning for warning in warnings)
    assert any("strokes missing" in warning for warning in warnings)


def build_score_breakdown_rows(*, scores=None, putts=None, shots=None, pars=None):
    parsed = ParsedScorecardRows(
        score_row=scores if scores is not None else [4] * 18,
        putts_row=putts if putts is not None else [2] * 18,
        shots_to_green_row=shots if shots is not None else [2] * 18,
        par_row=pars if pars is not None else [4] * 18,
    )
    assembly = assemble_scan(
        parsed,
        course=None,
        to_par_scoring=False,
    )
    return assembly.round, assembly.notes


def test_score_breakdown_recovers_one_missing_auxiliary_value_in_each_direction():
    putts = [2] * 18
    shots = [2] * 18
    putts[0] = None
    shots[1] = None

    payload, warnings = build_score_breakdown_rows(putts=putts, shots=shots)

    assert payload["hole_scores"][0]["putts"] == 2
    assert payload["hole_scores"][1]["shots_to_green"] == 2
    assert not any(warning.startswith(("Hole 1 ", "Hole 2 ")) for warning in warnings)


def test_score_breakdown_rejects_and_recovers_auxiliary_values_above_strokes():
    putts = [2] * 18
    shots = [2] * 18
    putts[0] = 9
    shots[0] = 1
    putts[1] = 1
    shots[1] = 9

    payload, warnings = build_score_breakdown_rows(putts=putts, shots=shots)

    assert payload["hole_scores"][0]["putts"] == 3
    assert payload["hole_scores"][1]["shots_to_green"] == 3
    assert not any(warning.startswith(("Hole 1 ", "Hole 2 ")) for warning in warnings)


def test_score_breakdown_allows_recovered_zero_putts_but_not_zero_shots():
    putts = [2] * 18
    shots = [2] * 18
    putts[0] = None
    shots[0] = 4
    putts[1] = 4
    shots[1] = None

    payload, _ = build_score_breakdown_rows(putts=putts, shots=shots)

    assert payload["hole_scores"][0]["putts"] == 0
    assert payload["hole_scores"][1]["shots_to_green"] is None


@pytest.mark.parametrize(("evidence_holes", "expected_putts"), [(8, None), (9, 2)])
def test_score_breakdown_recovery_requires_nine_consistent_holes(
    evidence_holes,
    expected_putts,
):
    scores = [None] * 18
    putts = [None] * 18
    shots = [None] * 18
    for index in range(evidence_holes):
        scores[index] = 4
        putts[index] = 2
        shots[index] = 2
    scores[17] = 4
    shots[17] = 2

    payload, _ = build_score_breakdown_rows(scores=scores, putts=putts, shots=shots)

    assert payload["hole_scores"][17]["putts"] == expected_putts


def test_score_breakdown_conflict_disables_recovery_and_never_rewrites_strokes():
    putts = [2] * 18
    shots = [2] * 18
    shots[0] = 1
    putts[1] = None

    payload, warnings = build_score_breakdown_rows(putts=putts, shots=shots)

    assert payload["hole_scores"][0] == {
        "hole_number": 1,
        "strokes": 4,
        "putts": 2,
        "shots_to_green": 1,
        "fairway_hit": None,
        "green_in_regulation": True,
    }
    assert payload["hole_scores"][1]["putts"] is None
    assert "Hole 1 score breakdown conflicts with total strokes" in warnings


def test_score_breakdown_derives_gir_from_recovered_shots_value():
    putts = [2] * 18
    shots = [2] * 18
    putts[0] = 1
    shots[0] = 9
    pars = [5] + [4] * 17

    payload, _ = build_score_breakdown_rows(putts=putts, shots=shots, pars=pars)

    assert payload["hole_scores"][0]["shots_to_green"] == 3
    assert payload["hole_scores"][0]["green_in_regulation"] is True


def test_half_moon_bay_t_score_breakdown_regression():
    scores = [5, 5, 3, 6, 5, 5, 4, 6, 4, 5, 5, 5, 4, 6, 4, 4, 3, 6]
    putts = [2, 1, 2, 2, 2, 3, 3, 2, None, 2, 2, 2, 2, 1, 1, 2, 2, 2]
    shots = [3, 4, 1, 4, 3, 2, 1, 4, 2, 3, 3, 3, 2, 9, 3, 2, 1, 4]

    payload, warnings = build_score_breakdown_rows(
        scores=scores,
        putts=putts,
        shots=shots,
    )

    assert payload["hole_scores"][8]["putts"] == 2
    assert payload["hole_scores"][13]["shots_to_green"] == 5
    assert not any(warning.startswith(("Hole 9 ", "Hole 14 ")) for warning in warnings)


SAMPLE_2D = """
| HOLE | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| Handicap | 3 | 9 | 17 | 15 | 1 | 11 | 13 | 5 | 7 |
| G | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
|  | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
|  | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Par | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 |
""".strip()


def test_suppressed_putts_still_keep_internal_rows_for_disambiguation() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_2D,
        user_context="my name is G. scores written to par. no putts recorded.",
    )

    assert parsed.putts_row == []
    assert parsed.raw_putts_row[:9] == [2, 2, 2, 2, 2, 2, 2, 2, 2]
    assert parsed.raw_shots_to_green_row[:9] == [1, 1, 1, 1, 1, 1, 1, 1, 1]


def test_to_par_plus_one_is_flipped_to_birdie_using_internal_rows() -> None:
    parsed = parse_mistral_scorecard_rows(
        SAMPLE_2D,
        user_context=(
            "my name is G. scores written to par. no putts recorded. "
            "name on score row. row order: score, putts, shots to green"
        ),
    )

    assembly = assemble_scan(
        parsed,
        course=None,
        to_par_scoring=None,
    )
    round_payload, fields = assembly.round, assembly.notes

    assert round_payload["hole_scores"][0]["strokes"] == 3
    assert any("score sign corrected" in f for f in fields)


def test_untrusted_auxiliary_rows_do_not_flip_valid_plus_one() -> None:
    parsed = ParsedScorecardRows(
        par_row=[4],
        score_row=[1],
        score_to_par_hint=True,
        raw_putts_row=[1],
        raw_shots_to_green_row=[2],
        sign_evidence_trusted=False,
    )

    assembly = assemble_scan(
        parsed,
        course=None,
        to_par_scoring=None,
    )
    round_payload, fields = assembly.round, assembly.notes

    assert round_payload["hole_scores"][0]["strokes"] == 5
    assert not any("score sign corrected" in field for field in fields)


def _load_hmb_markdown() -> str:
    repo_root = Path(__file__).resolve().parents[1]
    raw = (repo_root / "raw_markdown_hmb.txt").read_text(encoding="utf-8")
    start = raw.find("| HOLE |")
    if start == -1:
        return raw.strip()
    end = raw.find("=== END ===", start)
    return raw[start:end if end != -1 else None].strip()


def test_half_moon_bay_score_only_keeps_hidden_rows_and_front9_strokes() -> None:
    markdown = _load_hmb_markdown()
    parsed = parse_mistral_scorecard_rows(
        markdown,
        user_context="my name is G. scores written to par. no putts recorded. name on score row.",
    )
    assembly = assemble_scan(
        parsed,
        course=None,
        to_par_scoring=None,
    )
    round_payload = assembly.round

    assert parsed.putts_row == []
    assert sum(v is not None for v in parsed.raw_putts_row) >= 9
    assert sum(v is not None for v in parsed.raw_shots_to_green_row) >= 9

    front9 = [h["strokes"] for h in round_payload["hole_scores"][:9]]
    assert front9 == [5, 3, 3, 5, 4, 3, 3, 5, 4]
