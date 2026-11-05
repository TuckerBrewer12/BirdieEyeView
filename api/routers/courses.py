"""Course API endpoints."""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from typing import List, Optional
from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from api.messages import (
    COURSE_ALREADY_CLONED, COURSE_CHANGES_INVALID, COURSE_DATA_INVALID, COURSE_NAME_TAKEN, COURSE_NOT_FOUND,
    COURSE_NOT_FOUND_OR_NOT_OWNED, EXTERNAL_LOOKUP_REQUIRES_AUTH, FORBIDDEN, MASTER_COURSE_READ_ONLY,
    SOURCE_COURSE_NOT_FOUND,
)
from api.dependencies import get_db, get_optional_current_user, get_current_user
from api.error_responses import COURSE_SAVE_FAILED
from api.input_validation import sanitize_search_query
from api.request_models import CreateCourseRequest, UpdateCourseRequest
from api.schemas import CourseResponse, CourseSummaryResponse
from models import Course, Hole, Tee, User
from models.hole_layout import rated_coverage
from services import GolfCourseAPIService

router = APIRouter()
logger = logging.getLogger(__name__)


def _summarize_course(c) -> CourseSummaryResponse:
    return CourseSummaryResponse(
        id=c.id,
        name=c.name,
        external_course_id=getattr(c, "external_course_id", None),
        source="local",
        location=c.location,
        par=c.get_par(),
        total_holes=len(c.holes),
        tee_count=len(c.tees),
    )


def _summarize_external_course(item: dict) -> CourseSummaryResponse:
    external_id = item.get("external_course_id")
    name = item.get("name")
    city = item.get("city")
    state = item.get("state")
    location = ", ".join([p for p in [city, state] if p]) or None
    fallback_id = (name or "unknown").strip().lower().replace(" ", "-")
    return CourseSummaryResponse(
        id=f"external:{external_id or fallback_id}",
        name=name,
        external_course_id=external_id,
        source="external",
        location=location,
        par=None,
        total_holes=0,
        tee_count=0,
    )


@router.get("", response_model=List[CourseSummaryResponse])
async def list_courses(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: Optional[UUID] = Query(None),
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    if user_id:
        if not current_user or str(current_user.id) != str(user_id):
            raise HTTPException(403, FORBIDDEN)
    courses = await db.courses.list_courses(limit=limit, offset=offset, user_id=str(user_id) if user_id else None)
    return [_summarize_course(c) for c in courses]


@router.get("/search", response_model=List[CourseSummaryResponse])
async def search_courses(
    q: str = Query(..., min_length=1, max_length=120),
    user_id: Optional[UUID] = Query(None),
    include_external: bool = Query(
        False,
        description="When true, include GolfCourseAPI fallback results after local search.",
    ),
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    try:
        q = sanitize_search_query(q, max_length=120)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    if user_id:
        if not current_user or str(current_user.id) != str(user_id):
            raise HTTPException(403, FORBIDDEN)
    if include_external and not current_user:
        raise HTTPException(401, EXTERNAL_LOOKUP_REQUIRES_AUTH)
    effective_user_id = str(user_id) if user_id else (str(current_user.id) if current_user else None)
    courses = await db.courses.search_courses(q, user_id=effective_user_id)
    out = [_summarize_course(c) for c in courses]
    # Local results come first (the user's own courses, then masters). The provider is only
    # searched when the database has nothing, to avoid spending provider calls on known courses.
    if not include_external or out:
        return out

    try:
        ext_items = await GolfCourseAPIService().search_external_courses(q, limit=20)
    except Exception as exc:  # noqa: BLE001
        logger.warning("GolfCourseAPI fallback failed for query='%s': %s", q, exc)
        return out

    # External selections must carry a stable provider ID; nothing is attached to local rows.
    return [summary for summary in map(_summarize_external_course, ext_items) if summary.external_course_id][:20]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    course = await db.courses.get_course(str(course_id))
    if not course:
        raise HTTPException(404, COURSE_NOT_FOUND)
    if course.user_id and (not current_user or str(current_user.id) != str(course.user_id)):
        raise HTTPException(403, FORBIDDEN)
    return course


@router.post("", status_code=201)
async def create_course(
    req: CreateCourseRequest,
    user_id: Optional[UUID] = Query(None, description="Owner user ID for the custom course"),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom course for a user."""
    effective_user_id = str(user_id) if user_id else str(current_user.id)
    if user_id and str(user_id) != str(current_user.id):
        raise HTTPException(403, FORBIDDEN)
    layout = tuple(sorted(h.number for h in req.holes))
    try:
        holes = [Hole(number=h.number, par=h.par, handicap=h.handicap) for h in req.holes]
        tees = [
            Tee(
                color=t.color,
                slope_rating=t.slope_rating,
                course_rating=t.course_rating,
                rating_holes=rated_coverage(layout, t.course_rating, t.slope_rating),
                hole_yardages={int(hole): yards for hole, yards in t.hole_yardages.items()},
            )
            for t in req.tees
        ]
    except ValidationError as error:
        raise HTTPException(422, COURSE_DATA_INVALID) from error

    try:
        course = Course(
            name=req.name,
            external_course_id=req.external_course_id,
            location=req.location,
            holes=holes,
            tees=tees,
        )
    except ValidationError as error:
        raise HTTPException(422, COURSE_DATA_INVALID) from error
    try:
        created = await db.courses.create_course(course, user_id=effective_user_id)
        return _summarize_course(created)
    except DuplicateError:
        raise HTTPException(409, COURSE_NAME_TAKEN)
    except IntegrityError:
        logger.exception("Course creation integrity failure")
        raise HTTPException(500, COURSE_SAVE_FAILED)


@router.put("/{course_id}")
async def update_course(
    course_id: UUID,
    req: UpdateCourseRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a custom course. Only the owner can edit; master courses are protected."""
    existing = await db.courses.get_course(str(course_id))
    if not existing:
        raise HTTPException(404, COURSE_NOT_FOUND)
    if existing.user_id != str(current_user.id):
        raise HTTPException(403, MASTER_COURSE_READ_ONLY)

    updates = req.model_dump(exclude_unset=True)
    try:
        updated = await db.courses.update_course(str(course_id), user_id=str(current_user.id), **updates)
    except DuplicateError as error:
        raise HTTPException(409, COURSE_NAME_TAKEN) from error
    except IntegrityError as error:
        raise HTTPException(422, COURSE_CHANGES_INVALID) from error
    if not updated:
        raise HTTPException(404, COURSE_NOT_FOUND_OR_NOT_OWNED)
    return _summarize_course(updated)


@router.post("/{course_id}/clone", status_code=201)
async def clone_course(
    course_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clone a master course as a user-owned custom course."""
    try:
        source = await db.courses.get_course(str(course_id))
        if not source:
            raise HTTPException(404, SOURCE_COURSE_NOT_FOUND)
        if source.user_id and str(source.user_id) != str(current_user.id):
            raise HTTPException(403, FORBIDDEN)
        cloned = await db.courses.clone_course(str(course_id), str(current_user.id))
        return _summarize_course(cloned)
    except NotFoundError:
        raise HTTPException(404, SOURCE_COURSE_NOT_FOUND)
    except DuplicateError:
        raise HTTPException(409, COURSE_ALREADY_CLONED)
