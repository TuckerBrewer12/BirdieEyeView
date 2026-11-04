from uuid import uuid4

import pytest
from pydantic import ValidationError

from api.auth_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
)
from api.request_models import (
    CreateCourseRequest,
    CreateUserTeeRequest,
    HoleScoreInput,
    SaveRoundRequest,
    TeeInput,
    UpdateCourseRequest,
    UpdateRoundRequest,
    UpdateUserTeeRequest,
    normalize_hole_yardages,
)


def test_register_request_normalizes_profile_fields():
    home_course_id = str(uuid4())

    registration = RegisterRequest(
        name=" Golfer ",
        email=" GOLFER@example.com ",
        password="password123",
        home_course_id=home_course_id,
    )

    assert (
        registration.name,
        registration.email,
        registration.home_course_id,
    ) == ("Golfer", "golfer@example.com", home_course_id)


@pytest.mark.parametrize(
    "auth_request",
    [
        LoginRequest(email="A@B.COM", password="x"),
    ],
)
def test_auth_request_normalizes_email(auth_request):
    assert auth_request.email == "a@b.com"


def test_save_round_request_normalizes_text_fields():
    request = SaveRoundRequest(
        course_id=str(uuid4()),
        external_course_id=" ext-1 ",
        course_location=" Monterey ",
        tee_box=" Blue ",
        tee_yardages={"1": 410},
        all_tees=[TeeInput(color="Blue", hole_yardages={"1": 410, "2": None})],
        hole_scores=[HoleScoreInput(hole_number=1, strokes=4, putts=2)],
        course_holes=[{"hole_number": 1, "par": 4}],
        date="2026-09-04",
        notes="line one\r\nline two",
    )

    assert (request.course_location, request.tee_box, request.notes) == (
        "Monterey",
        "Blue",
        "line one\nline two",
    )


def test_save_round_request_omits_unknown_tee_yardages():
    request = SaveRoundRequest(
        hole_scores=[HoleScoreInput(hole_number=1, strokes=4)],
        all_tees=[TeeInput(color="Blue", hole_yardages={"1": 410, "2": None})],
    )

    # Unknown yardages are omitted, the domain's representation of an unknown hole.
    assert request.all_tees[0].hole_yardages == {"1": 410}


@pytest.mark.parametrize(
    "payload",
    [
        {"hole_scores": [{"hole_number": 1, "strokes": 2, "putts": 3}]},
        {"hole_scores": [{"hole_number": 1, "strokes": 4}, {"hole_number": 1, "strokes": 4}]},
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "course_holes": [{"hole_number": 1}, {"hole_number": 1}],
        },
        {"hole_scores": [{"hole_number": 1, "strokes": 4}], "date": "not-a-date"},
        {"hole_scores": [{"hole_number": 1, "strokes": 4}], "course_id": "bad"},
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"x": 100}}],
        },
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"19": 100}}],
        },
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"1": 1001}}],
        },
    ],
)
def test_save_round_request_rejects_invalid_payload(payload):
    with pytest.raises(ValidationError):
        SaveRoundRequest.model_validate(payload)


# ================================================================
# Shared contracts (API domain)
# ================================================================


@pytest.mark.parametrize(
    ("yardages", "expected"),
    [
        ({"1": 0, "2": 1000}, {1: 0, 2: 1000}),
        ({1: "350", "18": 410.0}, {1: 350, 18: 410}),
        ({"3": None}, {}),
    ],
)
def test_hole_yardages_accept_zero_to_one_thousand(yardages, expected):
    assert normalize_hole_yardages(yardages) == expected


@pytest.mark.parametrize(
    "yardages",
    [{"1": 1001}, {"19": 400}, {"01": 350, "1": 400}, {"1": 350.9}, {"1": True}, ["400"]],
    ids=["too-long", "hole-19", "same-hole-twice", "fraction", "bool", "not-a-map"],
)
def test_hole_yardages_reject_values_that_need_guessing(yardages):
    with pytest.raises(ValueError):
        normalize_hole_yardages(yardages)


def test_tee_input_accepts_nine_hole_rating():
    assert TeeInput(color="Blue", course_rating=35.0).course_rating == 35.0


@pytest.mark.parametrize(("field", "value"), [("course_rating", 0), ("course_rating", "nan"), ("slope_rating", 54)])
def test_tee_input_rejects_invalid_ratings(field, value):
    with pytest.raises(ValidationError):
        TeeInput(color="Blue", **{field: value})


def test_hole_score_rejects_shots_to_green_above_strokes():
    with pytest.raises(ValidationError, match="shots_to_green cannot exceed strokes"):
        HoleScoreInput(hole_number=1, strokes=3, shots_to_green=4)


def test_save_round_request_rejects_repeated_handicap_rank():
    with pytest.raises(ValidationError, match="handicap rank"):
        SaveRoundRequest(
            hole_scores=[HoleScoreInput(hole_number=1, strokes=4)],
            course_holes=[{"hole_number": 1, "handicap": 5}, {"hole_number": 2, "handicap": 5}],
        )


def test_register_request_rejects_boolean_handicap():
    with pytest.raises(ValidationError):
        RegisterRequest(name="Tucker", email="tucker@example.com", password="correct horse", handicap=True)


def test_save_round_request_needs_at_least_one_score():
    with pytest.raises(ValidationError, match="at least one hole"):
        SaveRoundRequest(hole_scores=[HoleScoreInput(hole_number=1), HoleScoreInput(hole_number=2)])


SCORES = {"hole_scores": [{"hole_number": 1, "strokes": 4}]}


@pytest.mark.parametrize(
    ("model", "base", "field", "name"),
    [
        (SaveRoundRequest, SCORES, "external_course_id", "external_course_id"),
        (SaveRoundRequest, SCORES, "course_name", "course_name"),
        (SaveRoundRequest, SCORES, "course_location", "course_location"),
        (SaveRoundRequest, SCORES, "tee_box", "tee_box"),
        (SaveRoundRequest, SCORES, "notes", "notes"),
        (CreateCourseRequest, {"name": "Links"}, "name", "name"),
        (CreateCourseRequest, {"name": "Links"}, "external_course_id", "external_course_id"),
        (CreateCourseRequest, {"name": "Links"}, "location", "location"),
        (UpdateCourseRequest, {}, "name", "name"),
        (UpdateCourseRequest, {}, "external_course_id", "external_course_id"),
        (UpdateCourseRequest, {}, "location", "location"),
        (UpdateRoundRequest, {}, "notes", "notes"),
        (UpdateRoundRequest, {}, "weather_conditions", "weather_conditions"),
        (UpdateRoundRequest, {}, "tee_box", "tee_box"),
        (UpdateRoundRequest, {}, "course_name_played", "course_name_played"),
        (CreateUserTeeRequest, {"name": "Blue"}, "name", "name"),
        (UpdateUserTeeRequest, {}, "name", "name"),
        (TeeInput, {"color": "Blue"}, "color", "tee color"),
    ],
)
def test_free_text_fields_reject_markup_under_their_own_name(model, base, field, name):
    with pytest.raises(ValidationError, match=f"{name} cannot contain HTML markup"):
        model(**(base | {field: "<b>x</b>"}))

