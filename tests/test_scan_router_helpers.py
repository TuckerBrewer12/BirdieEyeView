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


def test_image_normalization_resizes_and_converts(monkeypatch, tmp_path):
    source = tmp_path / "large.png"
    Image.new("RGBA", (2000, 1000), (255, 255, 255, 128)).save(source)
    monkeypatch.setattr(scan, "PREPROCESS_CACHE_ENABLED", False)

    normalized, cache_hit = scan._normalize_upload_for_ocr(source, "digest")
    try:
        with Image.open(normalized) as result:
            assert (result.mode, max(result.size)) == (
                "RGB",
                scan.OCR_LONG_EDGE_TARGET,
            )
        assert normalized != source and cache_hit is False
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

    assert response == {"id": saved.id, "total_score": None}
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
