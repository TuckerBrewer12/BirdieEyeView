import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

from database.db_manager import DatabaseManager
from database.exceptions import IntegrityError
from api.messages import (
    COURSE_ID_MUST_BE_A_VALID_UUID, COURSE_ID_NOT_FOUND, FORBIDDEN, OCR_TEXT_INVALID, PLAYER_NAME_NOT_READ,
    UNCLEAR_PLAYER_NAME, UNREADABLE_SCORE_ROWS, UPLOAD_NOT_PROCESSED, USER_CONTEXT_INVALID,
)
from api.dependencies import get_current_user, get_optional_current_user, get_db
from api.error_responses import EXTRACTION_FAILED, OCR_FAILED, ROUND_SAVE_FAILED, SCAN_FAILED, SCAN_SAVE_FAILED
from api.input_validation import ensure_uuid_str, sanitize_ocr_text, sanitize_user_text
from api.request_models import SaveRoundRequest
from api.player_handicap import player_handicap_index
from analytics.handicap import tee_course_handicap
from api.scan_errors import ScanExtractionError
from api.scan_uploads import check_upload_name, prepared_upload
from api.schemas import ConfidenceLevel, OcrTextResponse, SaveScanResponse, ScanResponse
from models import User
from models.hole import HOLES_PER_NINE, HOLES_PER_ROUND
from services.gemini_table_merger import merge_split_tables
from services.mistral_ocr_service import MistralOCRService
from services.mistral_scorecard_parser import ParsedScorecardRows, parse_mistral_scorecard_rows
from services.scan_service import ScanSaveRejected, ScanService

router = APIRouter()

MAX_OCR_TEXT_CHARS = 300_000
MAX_USER_CONTEXT_CHARS = 1_500
MISTRAL_OCR_MODEL = os.environ.get("MISTRAL_OCR_MODEL") or "mistral-ocr-latest"
MIN_SCORE_BREAKDOWN_EVIDENCE_HOLES = 9


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


LOG_SENSITIVE_OCR_DEBUG = _env_bool("LOG_SENSITIVE_OCR_DEBUG", False)


def _confidence_level(score: float) -> ConfidenceLevel:
    if score >= 0.85:
        return "high"
    if score >= 0.65:
        return "medium"
    if score >= 0.4:
        return "low"
    return "very_low"


def _build_confidence_payload(
    hole_scores: List[Dict],
    fields_needing_review: List[str],
) -> Dict:
    hole_conf = []
    present = 0
    for hs in hole_scores:
        hole_num = hs.get("hole_number")
        strokes = hs.get("strokes")
        putts = hs.get("putts")
        gir = hs.get("green_in_regulation")
        strokes_conf = 0.9 if strokes is not None else 0.2
        putts_conf = 0.85 if putts is not None else 0.25
        gir_conf = 0.8 if gir is not None else 0.3
        overall = min(strokes_conf, putts_conf)
        if strokes is not None:
            present += 1
        hole_conf.append(
            {
                "hole_number": hole_num,
                "fields": {
                    "strokes": {
                        "final_confidence": strokes_conf,
                        "level": _confidence_level(strokes_conf),
                        "validation_flags": [],
                    },
                    "putts": {
                        "final_confidence": putts_conf,
                        "level": _confidence_level(putts_conf),
                        "validation_flags": [],
                    },
                    "green_in_regulation": {
                        "final_confidence": gir_conf,
                        "level": _confidence_level(gir_conf),
                        "validation_flags": [],
                    },
                },
                "overall": overall,
                "level": _confidence_level(overall),
            }
        )

    overall = present / len(hole_scores) if hole_scores else 0.0
    overall = max(0.0, overall - min(0.5, len(fields_needing_review) * 0.02))
    return {
        "overall": overall,
        "level": _confidence_level(overall),
        "hole_scores": hole_conf,
    }


def _score_breakdown_rows_are_trusted(hole_scores: List[Dict]) -> bool:
    complete = [
        score
        for score in hole_scores
        if score["strokes"] is not None
        and score["putts"] is not None
        and score["shots_to_green"] is not None
    ]
    return (
        len(complete) >= MIN_SCORE_BREAKDOWN_EVIDENCE_HOLES
        and all(
            score["strokes"] == score["shots_to_green"] + score["putts"]
            for score in complete
        )
    )


def _build_round_from_parsed_rows(
    parsed: ParsedScorecardRows,
    *,
    course_model: Optional[object],
    to_par_scoring: Optional[bool],
) -> tuple[Dict, List[str]]:
    def _safe_list_attr(name: str):
        value = getattr(parsed, name, [])
        return value if isinstance(value, list) else []

    fields_needing_review: List[str] = list(parsed.warnings)

    known_course = course_model is not None
    hole_count = HOLES_PER_ROUND

    course_name = None
    course_location = None
    course_par = None
    course_holes: List[Dict] = []
    course_tees: List[Dict] = []
    hole_par_lookup: Dict[int, Optional[int]] = {}

    if known_course:
        course_name = getattr(course_model, "name", None)
        course_location = getattr(course_model, "location", None)
        course_par = course_model.get_par()
        model_holes = getattr(course_model, "holes", []) or []
        if model_holes:
            hole_count = min(HOLES_PER_ROUND, len(model_holes))
        for i in range(1, hole_count + 1):
            hole_obj = next((h for h in model_holes if getattr(h, "number", None) == i), None)
            p = getattr(hole_obj, "par", None) if hole_obj is not None else None
            hcp = getattr(hole_obj, "handicap", None) if hole_obj is not None else None
            hole_par_lookup[i] = p
            course_holes.append({"number": i, "par": p})
            if hcp is not None:
                course_holes[-1]["handicap"] = hcp
        for tee in (getattr(course_model, "tees", []) or []):
            yardages = getattr(tee, "hole_yardages", {}) or {}
            course_tees.append(
                {
                    "color": getattr(tee, "color", None),
                    "slope_rating": getattr(tee, "slope_rating", None),
                    "course_rating": getattr(tee, "course_rating", None),
                    "hole_yardages": {str(k): v for k, v in yardages.items() if v is not None},
                }
            )
    else:
        parsed_pars = list(_safe_list_attr("par_row")[:hole_count])
        while len(parsed_pars) < hole_count:
            parsed_pars.append(None)
        for i in range(1, hole_count + 1):
            handicap_row = _safe_list_attr("handicap_row")
            handicap = handicap_row[i - 1] if i - 1 < len(handicap_row) else None
            par_i = parsed_pars[i - 1]
            if par_i is not None and not (3 <= par_i <= 6):
                par_i = None
            course_holes.append({"number": i, "par": par_i, "handicap": handicap})
            hole_par_lookup[i] = par_i
        par_vals = [p for p in hole_par_lookup.values() if p is not None]
        if len(par_vals) >= HOLES_PER_NINE:
            course_par = sum(par_vals)
        for tr in _safe_list_attr("tee_rows"):
            yardage_map = {
                str(i + 1): y
                for i, y in enumerate(tr.yardages[:hole_count])
                if y is not None
            }
            course_tees.append(
                {
                    "color": tr.label,
                    "slope_rating": None,
                    "course_rating": None,
                    "hole_yardages": yardage_map,
                }
            )

    score_vals = list(_safe_list_attr("score_row")[:hole_count])
    while len(score_vals) < hole_count:
        score_vals.append(None)
    putt_vals = list(_safe_list_attr("putts_row")[:hole_count])
    while len(putt_vals) < hole_count:
        putt_vals.append(None)
    raw_putt_vals = list(_safe_list_attr("raw_putts_row")[:hole_count])
    while len(raw_putt_vals) < hole_count:
        raw_putt_vals.append(None)
    gir_vals = list(_safe_list_attr("gir_row")[:hole_count])
    while len(gir_vals) < hole_count:
        gir_vals.append(None)
    shots_vals = list(_safe_list_attr("shots_to_green_row")[:hole_count])
    while len(shots_vals) < hole_count:
        shots_vals.append(None)
    raw_shots_vals = list(_safe_list_attr("raw_shots_to_green_row")[:hole_count])
    while len(raw_shots_vals) < hole_count:
        raw_shots_vals.append(None)

    effective_to_par = to_par_scoring if to_par_scoring is not None else (parsed.score_to_par_hint is True)

    hole_scores: List[Dict] = []
    invalid_auxiliary_fields: Dict[int, Dict[str, str]] = {}
    for i in range(1, hole_count + 1):
        raw_score = score_vals[i - 1]
        sign_putts = raw_putt_vals[i - 1] if raw_putt_vals[i - 1] is not None else putt_vals[i - 1]
        sign_shots = raw_shots_vals[i - 1] if raw_shots_vals[i - 1] is not None else shots_vals[i - 1]
        if (
            effective_to_par is True
            and raw_score == 1
            and parsed.sign_evidence_trusted
            and sign_shots is not None
            and sign_putts is not None
            and 1 <= sign_shots <= 10
            and 0 <= sign_putts <= 6
            and hole_par_lookup.get(i) is not None
        ):
            # OCR can miss the minus sign and read "-1" as "1".
            # Use shots+putts vs par to disambiguate when possible.
            est = (sign_shots + sign_putts) - hole_par_lookup[i]  # type: ignore[index]
            if est in (-1, 1):
                if est != raw_score:
                    fields_needing_review.append(
                        f"Hole {i} score sign corrected (birdie vs bogey disambiguated)"
                    )
                raw_score = est

        strokes: Optional[int]
        if raw_score is None:
            strokes = None
            fields_needing_review.append(f"Hole {i} strokes missing")
        elif effective_to_par is True:
            par_i = hole_par_lookup.get(i)
            if par_i is None:
                strokes = None
                fields_needing_review.append(
                    f"Hole {i} cannot convert to-par score without known par"
                )
            else:
                converted = par_i + raw_score
                strokes = converted if 1 <= converted <= 15 else None
        else:
            strokes = raw_score if 1 <= raw_score <= 15 else None

        invalid_fields: Dict[str, str] = {}

        putts = putt_vals[i - 1]
        if putts is not None and not (0 <= putts <= 10):
            putts = None
            invalid_fields["putts"] = f"Hole {i} putts out of range"
        if putts is not None and strokes is not None and putts > strokes:
            putts = None
            invalid_fields["putts"] = f"Hole {i} putts exceed strokes"

        shots_val = shots_vals[i - 1]
        if shots_val is not None and not (1 <= shots_val <= 10):
            shots_val = None
            invalid_fields["shots_to_green"] = f"Hole {i} shots to green out of range"
        if shots_val is not None and strokes is not None and shots_val > strokes:
            shots_val = None
            invalid_fields["shots_to_green"] = f"Hole {i} shots to green exceed strokes"

        if invalid_fields:
            invalid_auxiliary_fields[i] = invalid_fields

        hole_scores.append(
            {
                "hole_number": i,
                "strokes": strokes,
                "putts": putts,
                "shots_to_green": shots_val,
                "fairway_hit": None,
                "green_in_regulation": gir_vals[i - 1],
            }
        )

    rows_are_trusted = _score_breakdown_rows_are_trusted(hole_scores)
    for score in hole_scores:
        hole_number = score["hole_number"]
        strokes = score["strokes"]
        putts = score["putts"]
        shots_val = score["shots_to_green"]

        if rows_are_trusted and strokes is not None:
            if putts is None and shots_val is not None:
                recovered_putts = strokes - shots_val
                if 0 <= recovered_putts <= 10:
                    score["putts"] = recovered_putts
                    putts = recovered_putts
                    invalid_auxiliary_fields.get(hole_number, {}).pop("putts", None)
            elif shots_val is None and putts is not None:
                recovered_shots = strokes - putts
                if 1 <= recovered_shots <= 10:
                    score["shots_to_green"] = recovered_shots
                    shots_val = recovered_shots
                    invalid_auxiliary_fields.get(hole_number, {}).pop("shots_to_green", None)

        if (
            strokes is not None
            and putts is not None
            and shots_val is not None
            and strokes != shots_val + putts
        ):
            fields_needing_review.append(
                f"Hole {hole_number} score breakdown conflicts with total strokes"
            )

        unresolved_fields = invalid_auxiliary_fields.get(hole_number, {})
        fields_needing_review.extend(unresolved_fields.values())

        if shots_val is None and strokes is not None and putts is not None:
            shots_val = strokes - putts
        if score["green_in_regulation"] is None and shots_val is not None:
            par_i = hole_par_lookup.get(hole_number)
            if par_i is not None:
                score["green_in_regulation"] = shots_val <= max(1, par_i - 2)

    round_payload = {
        "course": {
            "name": course_name,
            "location": course_location,
            "par": course_par,
            "holes": course_holes,
            "tees": course_tees,
        },
        "tee_box": None,
        "date": None,
        "hole_scores": hole_scores,
        "notes": None,
    }
    return round_payload, fields_needing_review


def _rated_tees(round_payload: Dict) -> List[Dict]:
    course = round_payload.get("course") or {}
    if course.get("par") is None:
        return []
    return [
        tee for tee in course.get("tees", [])
        if tee.get("slope_rating") is not None and tee.get("course_rating") is not None
    ]


def _add_course_handicaps(round_payload: Dict, handicap_index: Optional[float]) -> None:
    par = (round_payload.get("course") or {}).get("par")
    for tee in _rated_tees(round_payload):
        tee["course_handicap"] = tee_course_handicap(
            handicap_index, tee["slope_rating"], tee["course_rating"], par
        )


async def _run_ocr_pipeline(ocr_path: Path, diagnostics: Optional[List[str]] = None) -> str:
    svc = MistralOCRService()
    ocr_resp = await svc.ocr_file(ocr_path)

    pages = ocr_resp.get("pages")
    if LOG_SENSITIVE_OCR_DEBUG and isinstance(pages, list):
        for page_idx, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            tables = page.get("tables") or []
            if not isinstance(tables, list):
                continue
            for table_idx, table in enumerate(tables):
                if not isinstance(table, dict):
                    continue
                html_table = table.get("content")
                if isinstance(html_table, str) and html_table.strip():
                    logger.debug(
                        "Mistral HTML table page=%d table=%d:\n%s",
                        page_idx,
                        table_idx,
                        html_table,
                    )

    raw_markdown = MistralOCRService.extract_markdown_text(ocr_resp, diagnostics)
    if LOG_SENSITIVE_OCR_DEBUG:
        logger.debug("Mistral raw markdown:\n%s", raw_markdown)
    else:
        logger.info("Mistral OCR produced markdown chars=%d", len(raw_markdown))
    return await merge_split_tables(raw_markdown, diagnostics=diagnostics)


def _log_diagnostics(stage: str, diagnostics: List[str]) -> None:
    logger.info("Scan diagnostics (%s): %s", stage, " | ".join(diagnostics) or "none")


@router.post("/ocr", response_model=OcrTextResponse)
async def prefetch_ocr(file: UploadFile = File(...)):
    try:
        async with prepared_upload(file, for_ocr=True) as upload:
            diagnostics: List[str] = []
            markdown_text = await _run_ocr_pipeline(upload.ocr_path, diagnostics)
            _log_diagnostics("ocr", diagnostics)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Prefetch OCR failed")
        raise HTTPException(500, OCR_FAILED) from None
    logger.info("Prefetch OCR complete: chars=%d", len(markdown_text))
    return OcrTextResponse(ocr_text=markdown_text)


@router.post("/extract", response_model=ScanResponse)
async def extract_scan(
    file: UploadFile = File(...),
    user_context: Optional[str] = Form(None),
    course_id: Optional[str] = Form(None),
    ocr_text: Optional[str] = Form(None),
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    request_t0 = time.perf_counter()
    logger.info(
        "Scan extract request received: filename=%s course_id=%s user_id=%s",
        file.filename,
        course_id,
        getattr(current_user, "id", "anonymous"),
    )
    try:
        check_upload_name(file)
    except HTTPException as exc:
        raise ScanExtractionError(exc.status_code, exc.detail, category="invalid_upload", stage="upload") from None
    if user_context is not None:
        try:
            user_context = sanitize_user_text(
                user_context,
                field_name="user_context",
                max_length=MAX_USER_CONTEXT_CHARS,
                allow_newlines=True,
                allow_empty=True,
            )
        except ValueError:
            raise HTTPException(
                422, USER_CONTEXT_INVALID.format(limit=MAX_USER_CONTEXT_CHARS)
            ) from None
    if course_id is not None and course_id.strip():
        try:
            course_id = ensure_uuid_str(course_id, "course_id")
        except ValueError:
            raise HTTPException(422, COURSE_ID_MUST_BE_A_VALID_UUID) from None
    elif course_id is not None:
        course_id = None
    if ocr_text is not None:
        try:
            ocr_text = sanitize_ocr_text(ocr_text, max_length=MAX_OCR_TEXT_CHARS)
        except ValueError:
            raise HTTPException(
                422, OCR_TEXT_INVALID.format(limit=MAX_OCR_TEXT_CHARS)
            ) from None

    failure_stage = "upload"
    diagnostics: List[str] = []

    try:
        async with prepared_upload(file, for_ocr=not ocr_text) as upload:
            to_par_scoring: Optional[bool] = None

            failure_stage = "unknown"
            course_model = None
            t_course_lookup_start = time.perf_counter()
            if course_id:
                course_model = await db.courses.get_course(course_id)
                if course_model is None:
                    raise HTTPException(404, COURSE_ID_NOT_FOUND.format(course_id=course_id))
                if course_model.user_id and (current_user is None or str(course_model.user_id) != str(current_user.id)):
                    raise HTTPException(403, FORBIDDEN)
            t_course_lookup_end = time.perf_counter()
            logger.info(
                "Scan stage complete: stage=course_lookup has_course_id=%s found=%s lookup_ms=%.1f",
                bool(course_id),
                course_model is not None,
                (t_course_lookup_end - t_course_lookup_start) * 1000.0,
            )
            failure_stage = "ocr"
            t_extract_start = time.perf_counter()
            if ocr_text:
                markdown_text = ocr_text
                logger.info("Scan using prefetched OCR text: chars=%d", len(markdown_text))
            else:
                markdown_text = await _run_ocr_pipeline(upload.ocr_path, diagnostics)
                logger.info(
                    "Scan OCR+merge complete: extract_ms=%.1f chars=%d",
                    (time.perf_counter() - t_extract_start) * 1000.0,
                    len(markdown_text),
                )

            if LOG_SENSITIVE_OCR_DEBUG:
                logger.debug("Merged markdown:\n%s", markdown_text)
            else:
                logger.info("Merged OCR markdown chars=%d", len(markdown_text))

            failure_stage = "parse"
            t_parse_start = time.perf_counter()
            parsed_rows = parse_mistral_scorecard_rows(markdown_text, user_context=user_context)
            diagnostics.extend(parsed_rows.diagnostics)
            failure_stage = "assembly"
            round_data, fields_needing_review = _build_round_from_parsed_rows(
                parsed_rows,
                course_model=course_model,
                to_par_scoring=to_par_scoring,
            )
            name_missing = bool(parsed_rows.player_name) and not parsed_rows.player_row_found

            present_strokes = len(
                [h for h in round_data.get("hole_scores", []) if h.get("strokes") is not None]
            )
            if present_strokes == 0:
                diagnostics.append("assembly: no strokes could be assembled")
                _log_diagnostics("extract", diagnostics)
                error = ScanExtractionError(
                    422,
                    UNCLEAR_PLAYER_NAME if name_missing else UNREADABLE_SCORE_ROWS,
                    category="unreadable_scores", stage="parse",
                )
                error.diagnostics = diagnostics
                raise error
            if name_missing:
                fields_needing_review.append(PLAYER_NAME_NOT_READ)
            _log_diagnostics("extract", diagnostics)

            if _rated_tees(round_data):
                _add_course_handicaps(round_data, await player_handicap_index(db, current_user))
            confidence_data = _build_confidence_payload(round_data.get("hole_scores", []), fields_needing_review)
            t_parse_end = time.perf_counter()
            logger.info(
                "Scan stage complete: stage=mistral_parse extraction_mode=%s parse_ms=%.1f score_cells=%d putt_cells=%d gir_cells=%d shots_cells=%d to_par_hint=%s warnings=%d",
                parsed_rows.extraction_mode,
                (t_parse_end - t_parse_start) * 1000.0,
                len([h for h in round_data.get("hole_scores", []) if h.get("strokes") is not None]),
                len([h for h in round_data.get("hole_scores", []) if h.get("putts") is not None]),
                len([h for h in round_data.get("hole_scores", []) if h.get("green_in_regulation") is not None]),
                len([v for v in parsed_rows.shots_to_green_row if v is not None]),
                parsed_rows.score_to_par_hint is True,
                len(fields_needing_review),
            )

            return ScanResponse.model_validate(
                {
                    "round": round_data,
                    "confidence": confidence_data,
                    "fields_needing_review": fields_needing_review,
                }
            )
    except FileNotFoundError:
        raise ScanExtractionError(400, UPLOAD_NOT_PROCESSED, category="invalid_upload", stage=failure_stage) from None
    except EnvironmentError:
        logger.exception("Scan extraction service unavailable")
        raise ScanExtractionError(500, SCAN_FAILED, category="service_unavailable", stage=failure_stage) from None
    except ScanExtractionError:
        raise
    except HTTPException as exc:
        category = "invalid_upload" if failure_stage == "upload" and exc.status_code in {400, 413} else "http_error"
        raise ScanExtractionError(exc.status_code, exc.detail, category=category, stage=failure_stage) from None
    except Exception:
        logger.exception("Scan extraction error")
        raise ScanExtractionError(500, EXTRACTION_FAILED, category="extraction_failed", stage=failure_stage) from None
    finally:
        logger.info(
            "Scan extract request complete: total_ms=%.1f",
            (time.perf_counter() - request_t0) * 1000.0,
        )


@router.post("/save", response_model=SaveScanResponse)
async def save_round(
    req: SaveRoundRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        req.user_id = str(current_user.id)
        logger.info(
            "Scan save request received: user_id=%s course_id=%s external_course_id=%s course_name=%s",
            req.user_id,
            req.course_id,
            req.external_course_id,
            req.course_name,
        )
        service = ScanService(db)
        saved = await service.save_reviewed_scan(req)
        return {"id": saved.id, "total_score": saved.calculate_total_score()}
    except ScanSaveRejected as exc:
        raise HTTPException(422, " ".join(exc.reasons)) from None
    except (ValueError, IntegrityError):
        logger.exception("Save round validation failed")
        raise HTTPException(400, ROUND_SAVE_FAILED) from None
    except Exception:
        logger.exception("Save round error")
        raise HTTPException(500, SCAN_SAVE_FAILED) from None
