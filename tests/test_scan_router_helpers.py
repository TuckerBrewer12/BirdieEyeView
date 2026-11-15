from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from api.main import app
from api.request_models import SaveRoundRequest
from api.routers import scan
from database.exceptions import IntegrityError
from models import User
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow
from services.scan_service import ScanSaveRejected


def make_upload(name: str, content_type: str, data: bytes = b"data") -> UploadFile:
    return UploadFile(
        file=BytesIO(data),
        filename=name,
        headers=Headers({"content-type": content_type}),
    )


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
        "read_scorecard",
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


@pytest.mark.asyncio
async def test_extract_scan_returns_the_typed_scan(monkeypatch):
    image_bytes = BytesIO()
    Image.new("RGB", (20, 10), "white").save(image_bytes, format="PNG")
    upload = make_upload("card.png", "image/png", image_bytes.getvalue())
    monkeypatch.setattr(
        scan,
        "parse_mistral_scorecard_rows",
        lambda markdown, user_context=None: ParsedScorecardRows(
            course_name="Pebble Beach",
            par_row=[4, 3],
            tee_rows=[ParsedTeeRow(label="Gold", yardages=[400, 180])],
            score_row=[5, 3],
            putts_row=[2, None],
        ),
    )

    response = await scan.extract_scan(
        upload,
        user_context=None,
        course_id=None,
        ocr_text="| card |",
        db=SimpleNamespace(),
        current_user=None,
    )

    assert isinstance(response, scan.ScanResponse)
    assert response.round.course is not None
    assert response.round.course.name is None
    assert response.round.course.holes[0].model_dump() == {"number": 1, "par": 4, "handicap": None}
    assert response.round.course.tees[0].hole_yardages == {"1": 400, "2": 180}
    assert response.round.hole_scores[0].model_dump() == {
        "hole_number": 1,
        "strokes": 5,
        "putts": 2,
        "shots_to_green": None,
        "fairway_hit": None,
        "green_in_regulation": False,
    }
    first_hole = response.confidence.hole_scores[0]
    assert first_hole.fields.strokes is not None
    assert first_hole.fields.strokes.level == "high"
    assert response.confidence.hole_scores[1].fields.putts is not None
    assert response.confidence.hole_scores[1].fields.putts.level == "very_low"

    schemas = app.openapi()["components"]["schemas"]
    assert schemas["FieldConfidence"]["properties"]["level"]["enum"] == ["high", "medium", "low", "very_low"]
    for path, model in [
        ("/api/scan/extract", "ScanResponse"),
        ("/api/scan/ocr", "OcrTextResponse"),
        ("/api/scan/save", "SaveScanResponse"),
    ]:
        response_schema = app.openapi()["paths"][path]["post"]["responses"]["200"]["content"]["application/json"]
        assert response_schema["schema"] == {"$ref": f"#/components/schemas/{model}"}
