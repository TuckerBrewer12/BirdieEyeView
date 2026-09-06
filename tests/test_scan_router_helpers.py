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
from models import Course, Hole, Round, Tee, User
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow


def _make_upload(name: str, content_type: str, data: bytes = b"data") -> UploadFile:
    return UploadFile(
        file=BytesIO(data),
        filename=name,
        headers=Headers({"content-type": content_type}),
    )


def test_upload_suffix_and_environment_helpers(monkeypatch):
    monkeypatch.delenv("SCAN_TEST_BOOL", raising=False)
    assert scan._env_bool("SCAN_TEST_BOOL", True) is True
    monkeypatch.setenv("SCAN_TEST_BOOL", "yes")
    assert scan._env_bool("SCAN_TEST_BOOL") is True
    monkeypatch.setenv("SCAN_TEST_BOOL", "no")
    assert scan._env_bool("SCAN_TEST_BOOL") is False

    assert scan._extract_upload_suffix(_make_upload("card.JPG", "image/jpeg")) == ".jpg"
    with pytest.raises(HTTPException, match="Filename is required"):
        scan._extract_upload_suffix(_make_upload("", "image/jpeg"))
    with pytest.raises(HTTPException, match="Unsupported file type"):
        scan._extract_upload_suffix(_make_upload("card.exe", "application/octet-stream"))
    with pytest.raises(HTTPException, match="Unsupported upload content type"):
        scan._extract_upload_suffix(_make_upload("card.jpg", "text/plain"))


def test_upload_payload_validation_and_streaming(monkeypatch, tmp_path):
    valid_pdf = tmp_path / "card.pdf"
    valid_pdf.write_bytes(b"%PDF-rest")
    scan._validate_upload_payload(valid_pdf, ".pdf")
    invalid_pdf = tmp_path / "bad.pdf"
    invalid_pdf.write_bytes(b"wrong")
    with pytest.raises(HTTPException, match="Invalid PDF"):
        scan._validate_upload_payload(invalid_pdf, ".pdf")

    image_path = tmp_path / "card.png"
    Image.new("RGB", (20, 10), "white").save(image_path)
    scan._validate_upload_payload(image_path, ".png")
    invalid_image = tmp_path / "bad.png"
    invalid_image.write_bytes(b"not-an-image")
    with pytest.raises(HTTPException, match="Invalid or unreadable"):
        scan._validate_upload_payload(invalid_image, ".png")

    uploaded = _make_upload("card.png", "image/png", b"abc")
    saved_path, digest = scan._save_upload_to_temp(uploaded, ".png")
    try:
        assert saved_path.read_bytes() == b"abc"
        assert len(digest) == 64
    finally:
        saved_path.unlink(missing_ok=True)

    monkeypatch.setattr(scan, "MAX_UPLOAD_BYTES", 3)
    with pytest.raises(HTTPException) as exc:
        scan._save_upload_to_temp(_make_upload("large.png", "image/png", b"abcd"), ".png")
    assert exc.value.status_code == 413


def test_image_normalization_cache_path_and_fallback(monkeypatch, tmp_path):
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_DIR", tmp_path / "cache")
    cache_path = scan._get_preprocess_cache_path("digest")
    assert cache_path.parent.exists()
    assert "digest" in cache_path.name

    source = tmp_path / "large.png"
    Image.new("RGBA", (2000, 1000), (255, 255, 255, 128)).save(source)
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_ENABLED", False)
    normalized, cache_hit = scan._normalize_upload_for_ocr(source, "digest")
    try:
        assert normalized != source
        assert cache_hit is False
        with Image.open(normalized) as result:
            assert result.mode == "RGB"
            assert max(result.size) == scan.OCR_LONG_EDGE_TARGET
    finally:
        normalized.unlink(missing_ok=True)

    bad = tmp_path / "bad.jpg"
    bad.write_bytes(b"bad")
    fallback, cache_hit = scan._normalize_upload_for_ocr(bad, "bad")
    assert fallback == bad
    assert cache_hit is False


def test_confidence_payload_levels_and_penalty():
    assert scan._confidence_level(0.9) == "high"
    assert scan._confidence_level(0.7) == "medium"
    assert scan._confidence_level(0.5) == "low"
    assert scan._confidence_level(0.1) == "very_low"

    payload = scan._build_confidence_payload(
        [
            {"hole_number": 1, "strokes": 4, "putts": 2, "green_in_regulation": True},
            {"hole_number": 2, "strokes": None, "putts": None, "green_in_regulation": None},
        ],
        ["review"],
    )
    assert payload["overall"] == pytest.approx(0.48)
    assert payload["hole_scores"][0]["fields"]["strokes"]["level"] == "high"
    assert payload["hole_scores"][1]["level"] == "very_low"
    assert scan._build_confidence_payload([], ["warning"])["overall"] == 0


def test_build_round_from_known_course_covers_score_guards():
    course = Course(
        name="Pebble Beach",
        location="Monterey",
        holes=[
            Hole(number=1, par=4, handicap=1),
            Hole(number=2, par=3, handicap=18),
            Hole(number=3, par=None),
        ],
        tees=[Tee(color="Blue", slope_rating=125, course_rating=72, hole_yardages={1: 400})],
    )
    parsed = ParsedScorecardRows(
        score_row=[0, 20, 1],
        putts_row=[2, 11, 3],
        shots_to_green_row=[2, 0, 11],
        gir_row=[None, None, None],
        score_to_par_hint=True,
        warnings=["existing warning"],
    )

    payload, warnings = scan._build_round_from_parsed_rows(
        parsed, course_model=course, to_par_scoring=None
    )

    assert payload["course"]["name"] == "Pebble Beach"
    assert payload["course"]["tees"][0]["hole_yardages"] == {"1": 400}
    assert payload["hole_scores"][0]["strokes"] == 4
    assert payload["hole_scores"][0]["green_in_regulation"] is True
    assert payload["hole_scores"][1]["strokes"] is None
    assert payload["hole_scores"][1]["putts"] is None
    assert payload["hole_scores"][2]["strokes"] is None
    assert payload["hole_scores"][2]["shots_to_green"] is None
    assert "existing warning" in warnings
    assert any("without known par" in warning for warning in warnings)


def test_build_round_from_unknown_course_uses_ocr_metadata():
    parsed = ParsedScorecardRows(
        course_name="  PEBBLE   BEACH  ",
        par_row=[4] * 9 + [7],
        handicap_row=list(range(1, 11)),
        tee_rows=[ParsedTeeRow(label="Gold", yardages=[400, None, 180])],
        score_row=[4, None, 2],
        putts_row=[5, 2, 1],
        shots_to_green_row=[2, 2, 2],
    )

    payload, warnings = scan._build_round_from_parsed_rows(
        parsed, course_model=None, to_par_scoring=False
    )

    assert payload["course"]["name"] == "Pebble Beach"
    assert payload["course"]["par"] == 36
    assert payload["course"]["holes"][9]["par"] is None
    assert payload["course"]["tees"][0]["hole_yardages"] == {"1": 400, "3": 180}
    assert payload["hole_scores"][0]["putts"] is None
    assert any("putts exceed strokes" in warning for warning in warnings)
    assert any("strokes missing" in warning for warning in warnings)


@pytest.mark.asyncio
async def test_ocr_pipeline_uses_service_and_merger(monkeypatch, tmp_path):
    ocr_service = SimpleNamespace(
        ocr_file=AsyncMock(return_value={"pages": [{"markdown": "raw markdown"}]})
    )
    monkeypatch.setattr(scan, "MistralOCRService", lambda: ocr_service)
    monkeypatch.setattr(
        scan.MistralOCRService,
        "extract_markdown_text",
        lambda response: response["pages"][0]["markdown"],
        raising=False,
    )
    merger = AsyncMock(return_value="merged markdown")
    monkeypatch.setattr(scan, "merge_split_tables", merger)

    assert await scan._run_ocr_pipeline(tmp_path / "card.jpg") == "merged markdown"
    merger.assert_awaited_once_with("raw markdown")


@pytest.mark.asyncio
async def test_save_round_maps_success_and_errors(monkeypatch):
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com")
    request = SaveRoundRequest.model_validate(
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "course_name": "Pebble Beach",
        }
    )
    saved = Round(id=str(uuid4()), hole_scores=[])
    scan_service = SimpleNamespace(save_reviewed_scan=AsyncMock(return_value=saved))
    monkeypatch.setattr(scan, "ScanService", lambda db: scan_service)

    save_response = await scan.save_round(request, SimpleNamespace(), user)
    assert save_response == {"id": saved.id, "total_score": None}
    assert request.user_id == user.id

    scan_service.save_reviewed_scan.side_effect = ValueError("invalid round")
    with pytest.raises(HTTPException) as exc:
        await scan.save_round(request, SimpleNamespace(), user)
    assert exc.value.status_code == 400

    scan_service.save_reviewed_scan.side_effect = RuntimeError("db")
    with pytest.raises(HTTPException) as exc:
        await scan.save_round(request, SimpleNamespace(), user)
    assert exc.value.status_code == 500
