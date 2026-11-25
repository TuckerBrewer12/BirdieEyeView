import asyncio
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from typing import List, Optional
from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError, DuplicateProviderIdError, IntegrityError, NotFoundError
from api.messages import (
    COURSE_ALREADY_CLONED, COURSE_CHANGES_INVALID, COURSE_DATA_INVALID, COURSE_NAME_TAKEN, COURSE_NOT_FOUND,
    COURSE_NOT_FOUND_OR_NOT_OWNED, COURSE_PAR_FROM_HOLES, COURSE_PROVIDER_ID_TAKEN, EXTERNAL_LOOKUP_REQUIRES_AUTH,
    MASTER_COURSE_READ_ONLY, Q_MUST_BE_PLAIN_TEXT_OF_AT_MOST_120_CHARACTERS, SOURCE_COURSE_NOT_FOUND,
)
from api.course_access import load_linkable_course, require_own_filter
from api.course_responses import course_detail, course_summary, external_summaries, summary_list
from api.dependencies import get_db, get_optional_current_user, get_current_user
from api.player_handicap import player_handicap_index
from api.input_validation import sanitize_search_query
from api.request_models import CreateCourseRequest, UpdateCourseRequest
from api.schemas import CourseResponse, CourseSummaryResponse
from models import User
from services import GolfCourseAPIService
from services.golfcourse_api_service import CourseProviderUnavailable

router = APIRouter()
logger = logging.getLogger(__name__)

EXTERNAL_RESULT_LIMIT = 20


@router.get("", response_model=List[CourseSummaryResponse])
async def list_courses(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[UUID] = Query(None),
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    require_own_filter(user_id, current_user)
    summaries = await db.courses.list_course_summaries(limit=limit, offset=offset, user_id=str(user_id) if user_id else None)
    return await summary_list(db, summaries, current_user if user_id else None)


@router.get("/search", response_model=List[CourseSummaryResponse])
async def search_courses(
    q: str = Query(..., min_length=1, max_length=120),
    user_id: Optional[UUID] = Query(None),
    include_external: bool = Query(
        False,
        description="When true, include GolfCourseAPI fallback results after local search.",
    ),
    include_record: bool = Query(
        False,
        description="When true, each course carries the user's record there, as the course list shows it.",
    ),
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    try:
        q = sanitize_search_query(q, max_length=120)
    except ValueError:
        raise HTTPException(422, Q_MUST_BE_PLAIN_TEXT_OF_AT_MOST_120_CHARACTERS) from None

    require_own_filter(user_id, current_user)
    if include_external and not current_user:
        raise HTTPException(401, EXTERNAL_LOOKUP_REQUIRES_AUTH)
    effective_user_id = str(user_id) if user_id else (str(current_user.id) if current_user else None)
    summaries = await db.courses.search_course_summaries(q, user_id=effective_user_id)
    out = await summary_list(db, summaries, current_user if include_record else None)
    if not include_external or out:
        return out

    try:
        items = await GolfCourseAPIService().search_external_courses(q, limit=EXTERNAL_RESULT_LIMIT)
    except CourseProviderUnavailable as exc:
        logger.warning("GolfCourseAPI fallback failed: %s", exc)
        return out
    return external_summaries(items, EXTERNAL_RESULT_LIMIT)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    course, index = await asyncio.gather(
        load_linkable_course(
            db, course_id, str(current_user.id) if current_user else None,
            missing_detail=COURSE_NOT_FOUND, missing_status=404,
        ),
        player_handicap_index(db, current_user),
    )
    return course_detail(course, index)


@router.post("", status_code=201)
async def create_course(
    req: CreateCourseRequest,
    user_id: Optional[UUID] = Query(None, description="Owner user ID for the custom course"),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_own_filter(user_id, current_user)
    try:
        course = req.to_course()
    except ValidationError as error:
        raise HTTPException(422, COURSE_DATA_INVALID) from error
    try:
        created = await db.courses.create_course(course, user_id=str(current_user.id))
    except DuplicateProviderIdError:
        raise HTTPException(409, COURSE_PROVIDER_ID_TAKEN) from None
    except DuplicateError:
        raise HTTPException(409, COURSE_NAME_TAKEN) from None
    except IntegrityError:
        logger.exception("Course creation integrity failure")
        raise HTTPException(422, COURSE_DATA_INVALID) from None
    return course_summary(created)


@router.put("/{course_id}")
async def update_course(
    course_id: UUID,
    req: UpdateCourseRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.courses.get_course(str(course_id))
    if not existing:
        raise HTTPException(404, COURSE_NOT_FOUND)
    if existing.user_id != str(current_user.id):
        raise HTTPException(403, MASTER_COURSE_READ_ONLY)

    updates = req.model_dump(exclude_unset=True)
    if "par" in updates and existing.par_from_holes:
        raise HTTPException(422, COURSE_PAR_FROM_HOLES)
    try:
        updated = await db.courses.update_course(str(course_id), user_id=str(current_user.id), **updates)
    except DuplicateProviderIdError as error:
        raise HTTPException(409, COURSE_PROVIDER_ID_TAKEN) from error
    except DuplicateError as error:
        raise HTTPException(409, COURSE_NAME_TAKEN) from error
    except IntegrityError as error:
        raise HTTPException(422, COURSE_CHANGES_INVALID) from error
    if not updated:
        raise HTTPException(404, COURSE_NOT_FOUND_OR_NOT_OWNED)
    return course_summary(updated)


@router.post("/{course_id}/clone", status_code=201)
async def clone_course(
    course_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await load_linkable_course(
        db, course_id, str(current_user.id), missing_detail=SOURCE_COURSE_NOT_FOUND, missing_status=404,
    )
    try:
        cloned = await db.courses.clone_course(str(course_id), str(current_user.id))
    except NotFoundError:
        raise HTTPException(404, SOURCE_COURSE_NOT_FOUND) from None
    except DuplicateError:
        raise HTTPException(409, COURSE_ALREADY_CLONED) from None
    return course_summary(cloned)
