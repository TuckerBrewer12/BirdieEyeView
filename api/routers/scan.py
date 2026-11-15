import logging
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

logger = logging.getLogger(__name__)

from database.db_manager import DatabaseManager
from database.exceptions import IntegrityError
from api.messages import (
    COURSE_ID_MUST_BE_A_VALID_UUID, COURSE_ID_NOT_FOUND, FORBIDDEN, OCR_TEXT_INVALID, OCR_TEXT_TOO_LONG,
    PLAYER_NAME_NOT_READ, SCAN_REVIEW_NOTES,
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
from api.schemas import OcrTextResponse, SaveScanResponse, ScanResponse
from models import User
from services.mistral_scorecard_parser import parse_mistral_scorecard_rows
from services.scan_assembly import assemble_scan, scan_confidence
from services.scan_ocr import LOG_SENSITIVE_OCR_DEBUG, MAX_OCR_TEXT_CHARS, OcrTextTooLong, read_scorecard
from services.scan_service import ScanSaveRejected, ScanService

router = APIRouter()

MAX_USER_CONTEXT_CHARS = 1_500


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


def _log_diagnostics(stage: str, diagnostics: List[str]) -> None:
    logger.info("Scan diagnostics (%s): %s", stage, " | ".join(diagnostics) or "none")


@router.post("/ocr", response_model=OcrTextResponse)
async def prefetch_ocr(file: UploadFile = File(...)):
    try:
        async with prepared_upload(file, for_ocr=True) as upload:
            diagnostics: List[str] = []
            markdown_text = await read_scorecard(upload.ocr_path, diagnostics)
            _log_diagnostics("ocr", diagnostics)
    except OcrTextTooLong:
        raise HTTPException(422, OCR_TEXT_TOO_LONG) from None
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
                markdown_text = await read_scorecard(upload.ocr_path, diagnostics)
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
            assembly = assemble_scan(
                parsed_rows,
                course=course_model,
                to_par_scoring=to_par_scoring,
            )
            round_data = assembly.round
            fields_needing_review = assembly.warnings + [
                SCAN_REVIEW_NOTES[note.kind].format(hole=note.hole) for note in assembly.notes
            ]
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
            name_notes = [PLAYER_NAME_NOT_READ] if name_missing else []
            fields_needing_review.extend(name_notes)
            _log_diagnostics("extract", diagnostics)

            if _rated_tees(round_data):
                _add_course_handicaps(round_data, await player_handicap_index(db, current_user))
            confidence_data = scan_confidence(
                round_data.get("hole_scores", []), assembly.notes, round_notes=assembly.warnings + name_notes
            )
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
    except OcrTextTooLong:
        raise ScanExtractionError(
            422, OCR_TEXT_TOO_LONG, category="unreadable_scores", stage="ocr"
        ) from None
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
