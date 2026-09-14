from uuid import uuid4

import pytest
from pydantic import ValidationError

from api.auth_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
)
from api.request_models import HoleScoreInput, SaveRoundRequest, TeeInput


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
        ResendVerificationRequest(email="A@B.COM"),
        ForgotPasswordRequest(email="A@B.COM"),
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


def test_save_round_request_preserves_partial_tee_yardages():
    request = SaveRoundRequest(
        hole_scores=[HoleScoreInput(hole_number=1)],
        all_tees=[TeeInput(color="Blue", hole_yardages={"1": 410, "2": None})],
    )

    assert request.all_tees[0].hole_yardages == {"1": 410, "2": None}


@pytest.mark.parametrize(
    "payload",
    [
        {"hole_scores": [{"hole_number": 1, "strokes": 2, "putts": 3}]},
        {"hole_scores": [{"hole_number": 1}, {"hole_number": 1}]},
        {
            "hole_scores": [{"hole_number": 1}],
            "course_holes": [{"hole_number": 1}, {"hole_number": 1}],
        },
        {"hole_scores": [{"hole_number": 1}], "date": "not-a-date"},
        {"hole_scores": [{"hole_number": 1}], "course_id": "bad"},
        {
            "hole_scores": [{"hole_number": 1}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"x": 100}}],
        },
        {
            "hole_scores": [{"hole_number": 1}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"19": 100}}],
        },
        {
            "hole_scores": [{"hole_number": 1}],
            "all_tees": [{"color": "Blue", "hole_yardages": {"1": 49}}],
        },
    ],
)
def test_save_round_request_rejects_invalid_payload(payload):
    with pytest.raises(ValidationError):
        SaveRoundRequest.model_validate(payload)
