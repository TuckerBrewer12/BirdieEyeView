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
from models import Course, Hole, Round, Tee, User
from services.mistral_scorecard_parser import ParsedScorecardRows, ParsedTeeRow


def make_upload(name: str, content_type: str, data: bytes = b"data") -> UploadFile:
    return UploadFile(
        file=BytesIO(data),
        filename=name,
        headers=Headers({"content-type": content_type}),
    )


@pytest.mark.parametrize(
    ("configured", "default", "expected"),
    [(None, True, True), ("yes", False, True), ("no", True, False)],
)
def test_scan_boolean_environment(monkeypatch, configured, default, expected):
    if configured is None:
        monkeypatch.delenv("SCAN_TEST_BOOL", raising=False)
    else:
        monkeypatch.setenv("SCAN_TEST_BOOL", configured)

    assert scan._env_bool("SCAN_TEST_BOOL", default) is expected


def test_upload_suffix_normalizes_extension():
    assert scan._extract_upload_suffix(make_upload("card.JPG", "image/jpeg")) == ".jpg"


@pytest.mark.parametrize(
    ("upload", "message"),
    [
        (make_upload("", "image/jpeg"), "Filename is required"),
        (make_upload("card.exe", "application/octet-stream"), "Unsupported file type"),
        (make_upload("card.jpg", "text/plain"), "Unsupported upload content type"),
    ],
)
def test_upload_suffix_rejects_invalid_upload(upload, message):
    with pytest.raises(HTTPException, match=message):
        scan._extract_upload_suffix(upload)


def test_validate_pdf_upload(tmp_path):
    path = tmp_path / "card.pdf"
    path.write_bytes(b"%PDF-rest")

    scan._validate_upload_payload(path, ".pdf")


def test_validate_pdf_upload_rejects_bad_signature(tmp_path):
    path = tmp_path / "bad.pdf"
    path.write_bytes(b"wrong")

    with pytest.raises(HTTPException, match="Invalid PDF"):
        scan._validate_upload_payload(path, ".pdf")


def test_validate_image_upload(tmp_path):
    path = tmp_path / "card.png"
    Image.new("RGB", (20, 10), "white").save(path)

    scan._validate_upload_payload(path, ".png")


def test_validate_image_upload_rejects_unreadable_file(tmp_path):
    path = tmp_path / "bad.png"
    path.write_bytes(b"not-an-image")

    with pytest.raises(HTTPException, match="Invalid or unreadable"):
        scan._validate_upload_payload(path, ".png")


def test_save_upload_streams_content_to_temp_file():
    saved_path, digest = scan._save_upload_to_temp(make_upload("card.png", "image/png", b"abc"), ".png")
    try:
        assert saved_path.read_bytes() == b"abc"
        assert len(digest) == 64
    finally:
        saved_path.unlink(missing_ok=True)


def test_save_upload_enforces_size_limit(monkeypatch):
    monkeypatch.setattr(scan, "MAX_UPLOAD_BYTES", 3)

    with pytest.raises(HTTPException) as raised:
        scan._save_upload_to_temp(make_upload("large.png", "image/png", b"abcd"), ".png")

    assert raised.value.status_code == 413


def test_preprocess_cache_path_creates_cache_directory(monkeypatch, tmp_path):
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_DIR", tmp_path / "cache")

    cache_path = scan._get_preprocess_cache_path("digest")

    assert cache_path.parent.exists()
    assert "digest" in cache_path.name


def test_image_normalization_resizes_and_converts_at_ui_quality(monkeypatch, tmp_path):
    source = tmp_path / "large.png"
    Image.new("RGBA", (2400, 1200), (255, 255, 255, 128)).save(source)
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_ENABLED", False)

    normalized, cache_hit = scan._normalize_upload_for_ocr(source, "digest")
    try:
        with Image.open(normalized) as result:
            assert (result.mode, max(result.size)) == (
                "RGB",
                scan.OCR_LONG_EDGE_TARGET,
            )
            assert result.format == "JPEG"
        assert scan.OCR_LONG_EDGE_TARGET == 2000
        assert scan.OCR_JPEG_QUALITY == 80
        assert normalized != source and cache_hit is False
    finally:
        normalized.unlink(missing_ok=True)


def test_image_normalization_passes_through_ready_jpeg(monkeypatch, tmp_path):
    source = tmp_path / "prepared.jpg"
    Image.new("RGB", (2000, 1200), "white").save(source, format="JPEG", quality=80)
    original_bytes = source.read_bytes()
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_ENABLED", False)

    normalized, cache_hit = scan._normalize_upload_for_ocr(source, "digest")

    assert (normalized, cache_hit) == (source, False)
    assert normalized.read_bytes() == original_bytes


def test_image_normalization_reencodes_metadata_bearing_jpeg(monkeypatch, tmp_path):
    source = tmp_path / "metadata.jpg"
    exif = Image.Exif()
    exif[274] = 1
    Image.new("RGB", (1200, 800), "white").save(
        source,
        format="JPEG",
        quality=80,
        exif=exif,
    )
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_ENABLED", False)

    normalized, cache_hit = scan._normalize_upload_for_ocr(source, "digest")
    try:
        assert normalized != source
        assert cache_hit is False
        with Image.open(normalized) as result:
            assert not result.getexif()
    finally:
        normalized.unlink(missing_ok=True)


def test_image_normalization_falls_back_for_unreadable_image(tmp_path):
    path = tmp_path / "bad.jpg"
    path.write_bytes(b"bad")

    normalized, cache_hit = scan._normalize_upload_for_ocr(path, "bad")

    assert (normalized, cache_hit) == (path, False)


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


def test_build_round_works_out_greens_from_strokes_and_putts_without_a_shots_row():
    parsed = ParsedScorecardRows(
        par_row=[4, 4, 3, 5],
        score_row=[4, 6, 3, None],
        putts_row=[2, 2, None, 2],
        gir_row=[None, None, None, False],
    )

    payload, _ = scan._build_round_from_parsed_rows(parsed, course_model=None, to_par_scoring=False)

    greens = [hole["green_in_regulation"] for hole in payload["hole_scores"][:4]]
    # Two shots to the green on a par 4 is a green hit, four is not; with no putts or no
    # score there's nothing to work it out from, and a green the card marked stands.
    assert greens == [True, False, None, False]


def make_unknown_course_rows():
    parsed = ParsedScorecardRows(
        course_name="  PEBBLE   BEACH  ",
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

    assert (payload["course"]["name"], payload["course"]["par"]) == (
        "Pebble Beach",
        36,
    )
    assert payload["course"]["holes"][9]["par"] is None
    assert payload["course"]["tees"][0]["hole_yardages"] == {"1": 400, "3": 180}


def test_unknown_course_round_warns_about_invalid_scores():
    payload, warnings = make_unknown_course_rows()

    assert payload["hole_scores"][0]["putts"] is None
    assert any("putts exceed strokes" in warning for warning in warnings)
    assert any("strokes missing" in warning for warning in warnings)


@pytest.mark.asyncio
async def test_ocr_pipeline_merges_extracted_markdown(monkeypatch, tmp_path):
    ocr_service = SimpleNamespace(ocr_file=AsyncMock(return_value={"pages": [{"markdown": "raw markdown"}]}))
    monkeypatch.setattr(scan, "MistralOCRService", lambda: ocr_service)
    monkeypatch.setattr(
        scan.MistralOCRService,
        "extract_markdown_text",
        lambda response: response["pages"][0]["markdown"],
        raising=False,
    )
    merger = AsyncMock(return_value="merged markdown")
    monkeypatch.setattr(scan, "merge_split_tables", merger)

    result = await scan._run_ocr_pipeline(tmp_path / "card.jpg")

    assert result == "merged markdown"
    merger.assert_awaited_once_with("raw markdown")


def make_save_round_request():
    return SaveRoundRequest.model_validate(
        {
            "hole_scores": [{"hole_number": 1, "strokes": 4}],
            "course_name": "Pebble Beach",
        }
    )


@pytest.mark.asyncio
async def test_save_round_assigns_authenticated_user(monkeypatch):
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com")
    request = make_save_round_request()
    saved = Round(id=str(uuid4()), hole_scores=[])
    service = SimpleNamespace(save_reviewed_scan=AsyncMock(return_value=saved))
    monkeypatch.setattr(scan, "ScanService", lambda db: service)

    response = await scan.save_round(request, SimpleNamespace(), user)

    assert response.model_dump() == {"id": saved.id, "total_score": None}
    assert request.user_id == user.id


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
async def test_extract_scan_hides_provider_configuration_error(monkeypatch):
    image_bytes = BytesIO()
    Image.new("RGB", (20, 10), "white").save(image_bytes, format="PNG")
    upload = make_upload("card.png", "image/png", image_bytes.getvalue())
    provider_error = "MISTRAL_API_KEY environment variable is not set"
    monkeypatch.setattr(scan, "_normalize_upload_for_ocr", lambda path, digest: (path, False))
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


@pytest.mark.asyncio
async def test_extract_scan_returns_the_typed_scan(monkeypatch):
    """Extract sends a ScanResponse, so the generated client types the card, its confidence and its levels."""
    image_bytes = BytesIO()
    Image.new("RGB", (20, 10), "white").save(image_bytes, format="PNG")
    upload = make_upload("card.png", "image/png", image_bytes.getvalue())
    monkeypatch.setattr(scan, "_normalize_upload_for_ocr", lambda path, digest: (path, False))
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
    assert response.round.course.name == "Pebble Beach"
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
