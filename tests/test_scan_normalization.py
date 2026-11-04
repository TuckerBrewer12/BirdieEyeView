import math

import pytest
from pydantic import ValidationError

from api.request_models import CourseHoleInput, HoleScoreInput, SaveRoundRequest, TeeInput
from models import HoleScore
from services.scan_normalization import ScanValueError, normalize_decimal, normalize_whole_number


@pytest.mark.parametrize("value", [5, "5", 5.0, " 5 ", "5.0"])
def test_readable_whole_numbers_become_the_same_strict_score(value):
    strokes = normalize_whole_number(value, "strokes")

    assert strokes == 5
    assert HoleScore(hole_number=1, strokes=strokes).strokes == 5


@pytest.mark.parametrize("value", [True, False, 5.5, "5.5", "1/2", "seven", "true", "E", math.nan, math.inf, [5]])
def test_values_that_need_guessing_are_rejected(value):
    with pytest.raises(ScanValueError):
        normalize_whole_number(value, "strokes")


@pytest.mark.parametrize("value", [None, "", "   "])
def test_missing_values_stay_unknown(value):
    assert normalize_whole_number(value, "putts") is None


def test_zero_is_preserved():
    assert normalize_whole_number("0", "putts") == 0
    assert normalize_whole_number(0.0, "putts") == 0


@pytest.mark.parametrize(("value", "expected"), [("71.2", 71.2), (35, 35.0), (" 69.1 ", 69.1), (None, None)])
def test_decimal_ratings_are_normalized(value, expected):
    assert normalize_decimal(value, "course_rating") == expected


@pytest.mark.parametrize("value", [True, "71,2", "abc", math.nan, "inf"])
def test_invalid_ratings_are_rejected(value):
    with pytest.raises(ScanValueError):
        normalize_decimal(value, "course_rating")


@pytest.mark.parametrize(
    "build",
    [
        lambda: HoleScoreInput(hole_number=1, strokes=True),
        lambda: HoleScoreInput(hole_number=1, strokes=5, putts=False),
        lambda: HoleScoreInput(hole_number=1, strokes=5.5),
        lambda: CourseHoleInput(hole_number=1, par=True),
        lambda: TeeInput(color="Blue", hole_yardages={"1": True}),
        lambda: TeeInput(color="Blue", course_rating=True),
        lambda: SaveRoundRequest(hole_scores=[{"hole_number": 1, "strokes": 4}], tee_yardages={"1": "385.5"}),
    ],
)
def test_save_request_rejects_booleans_and_fractions(build):
    with pytest.raises(ValidationError):
        build()


def test_save_request_accepts_numeric_text():
    request = SaveRoundRequest(
        hole_scores=[{"hole_number": "1", "strokes": "5", "putts": 2.0}],
        course_holes=[{"hole_number": 1, "par": "4"}],
        all_tees=[{"color": "Blue", "course_rating": "71.2", "hole_yardages": {"1": "385"}}],
    )

    assert (request.hole_scores[0].strokes, request.hole_scores[0].putts) == (5, 2)
    assert (request.course_holes[0].par, request.all_tees[0].hole_yardages) == (4, {"1": 385})


@pytest.mark.parametrize(
    ("normalize", "value"),
    [(normalize_whole_number, "9" * 400), (normalize_whole_number, "1" * 7), (normalize_decimal, 10**400)],
    ids=["400-digit-text", "seven-digit-text", "huge-int-rating"],
)
def test_oversized_numbers_are_rejected_as_values_not_overflow(normalize, value):
    with pytest.raises(ScanValueError):
        normalize(value, "field")
