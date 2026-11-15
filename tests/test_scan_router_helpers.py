from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from api.request_models import SaveRoundRequest
from api.routers import scan
from database.exceptions import IntegrityError
from models import Course, Hole, Round, Tee, User
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow
from services.scan_service import ScanSaveRejected


def make_upload(name: str, content_type: str, data: bytes = b"data") -> UploadFile:
    return UploadFile(
        file=BytesIO(data),
        filename=name,
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.parametrize(
    ("score", "expected"),
    [(0.9, "high"), (0.7, "medium"), (0.5, "low"), (0.1, "very_low")],
)
def test_confidence_level_maps_score(score, expected):
    assert scan._confidence_level(score) == expected


def test_confidence_payload_scores_complete_and_missing_holes():
    payload = scan._build_confidence_payload(
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
    assert scan._build_confidence_payload([], ["warning"])["overall"] == 0


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
    return scan._build_round_from_parsed_rows(parsed, course_model=course, to_par_scoring=None)


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


def make_unknown_course_rows():
    parsed = ParsedScorecardRows(
        par_row=[4] * 9 + [7],
        handicap_row=list(range(1, 11)),
        tee_rows=[ParsedTeeRow(label="Gold", yardages=[400, None, 180])],
        score_row=[4, None, 2],
        putts_row=[5, 2, 1],
        shots_to_green_row=[2, 2, 2],
    )
    return scan._build_round_from_parsed_rows(parsed, course_model=None, to_par_scoring=False)


def test_unknown_course_round_builds_ocr_course_metadata():
    payload, _ = make_unknown_course_rows()

    # The course name is never read from the scan; the user picks or enters it in review.
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
    return scan._build_round_from_parsed_rows(
        parsed,
        course_model=None,
        to_par_scoring=False,
    )


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


def make_save_round_request():
    return SaveRoundRequest.model_validate(
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "course_name": "Pebble Beach",
        }
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (
            ValueError("course_id references users.private_courses"),
            400,
            "We couldn't save this round. Please try again.",
        ),
        (RuntimeError("duplicate key violates users.rounds_pkey"), 500, "Save failed. Please try again."),
    ],
)
async def test_save_round_hides_internal_error(monkeypatch, error, status_code, detail):
    request = make_save_round_request()
    service = SimpleNamespace(save_reviewed_scan=AsyncMock(side_effect=error))
    monkeypatch.setattr(scan, "ScanService", lambda db: service)

    with pytest.raises(HTTPException) as raised:
        await scan.save_round(request, SimpleNamespace(), User(id=str(uuid4())))

    assert (raised.value.status_code, raised.value.detail) == (status_code, detail)
    assert str(error) not in raised.value.detail


@pytest.mark.asyncio
async def test_save_round_reports_rejected_scan_as_422(monkeypatch):
    request = make_save_round_request()
    rejection = ScanSaveRejected(["Course data is incomplete.", "Missing par for holes 7, 12."])
    service = SimpleNamespace(save_reviewed_scan=AsyncMock(side_effect=rejection))
    monkeypatch.setattr(scan, "ScanService", lambda db: service)

    with pytest.raises(HTTPException) as raised:
        await scan.save_round(request, SimpleNamespace(), User(id=str(uuid4())))

    assert (raised.value.status_code, raised.value.detail) == (
        422,
        "Course data is incomplete. Missing par for holes 7, 12.",
    )


@pytest.mark.asyncio
async def test_extract_scan_hides_provider_configuration_error(monkeypatch):
    image_bytes = BytesIO()
    Image.new("RGB", (20, 10), "white").save(image_bytes, format="PNG")
    upload = make_upload("card.png", "image/png", image_bytes.getvalue())
    provider_error = "MISTRAL_API_KEY environment variable is not set"
    monkeypatch.setattr(
        scan,
        "_run_ocr_pipeline",
        AsyncMock(side_effect=EnvironmentError(provider_error)),
    )

    with pytest.raises(HTTPException) as raised:
        await scan.extract_scan(
            upload,
            user_context=None,
            course_id=None,
            ocr_text=None,
            db=SimpleNamespace(),
            current_user=None,
        )

    assert (raised.value.status_code, raised.value.detail) == (
        500,
        "We couldn't scan this scorecard. Please try again.",
    )
    assert provider_error not in raised.value.detail
