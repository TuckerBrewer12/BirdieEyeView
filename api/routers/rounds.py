import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from database.db_manager import DatabaseManager
from database.exceptions import IntegrityError, NotFoundError
from api.messages import (
    COURSE_NOT_FOUND, FORBIDDEN, ROUND_CHANGES_INVALID, ROUND_HOLES_DONT_MATCH_COURSE, ROUND_NOT_FOUND,
)
from api.error_responses import ROUND_LINK_FAILED, ROUND_UPDATE_FAILED
from api.dependencies import get_current_user, get_db
from api.request_models import LinkCourseRequest, UpdateRoundRequest
from api.schemas import RoundResponse, RoundSummaryResponse
from models import HoleScore, User
from api.round_responses import round_detail, round_summary, round_list
from api.player_handicap import player_handicap_index

logger = logging.getLogger(__name__)

router = APIRouter()




@router.get("/user/{user_id}", response_model=List[RoundSummaryResponse])
async def get_rounds_for_user(
    user_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    rounds_ = await db.rounds.get_round_summaries_for_user(str(user_id), limit=limit, offset=offset)
    return round_list(rounds_)


async def _check_round_ownership(round_id: UUID, current_user: User, db: DatabaseManager):
    owner_id = await db.rounds.get_round_owner_id(str(round_id))
    if owner_id is None:
        raise HTTPException(404, ROUND_NOT_FOUND)
    if owner_id != str(current_user.id):
        raise HTTPException(403, FORBIDDEN)


async def _check_course_access(course_id: UUID, current_user: User, db: DatabaseManager):
    course = await db.courses.get_course(str(course_id))
    if not course:
        raise HTTPException(404, COURSE_NOT_FOUND)
    if course.user_id and str(course.user_id) != str(current_user.id):
        raise HTTPException(403, FORBIDDEN)
    return course


@router.get("/{round_id}", response_model=RoundResponse)
async def get_round(
    round_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_round_ownership(round_id, current_user, db)
    round_ = await db.rounds.get_round(str(round_id))
    if not round_:
        raise HTTPException(404, ROUND_NOT_FOUND)
    return round_detail(round_, await player_handicap_index(db, current_user))


@router.put("/{round_id}", response_model=RoundResponse)
async def update_round(
    round_id: UUID,
    req: UpdateRoundRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_round_ownership(round_id, current_user, db)
    try:
        if req.hole_scores:
            hole_score_models = [
                HoleScore(
                    hole_number=hs.hole_number,
                    strokes=hs.strokes,
                    putts=hs.putts,
                    fairway_hit=hs.fairway_hit,
                    green_in_regulation=hs.green_in_regulation,
                    shots_to_green=hs.shots_to_green,
                    par_played=hs.par_played,
                    handicap_played=hs.handicap_played,
                )
                for hs in req.hole_scores
            ]
            updated = await db.rounds.update_hole_scores(
                str(round_id),
                hole_score_models,
                user_id=str(current_user.id),
            )
        else:
            updated = await db.rounds.get_round(str(round_id))

        if not updated:
            raise HTTPException(404, ROUND_NOT_FOUND)

        meta_updates = {}
        if req.notes is not None:
            meta_updates["notes"] = req.notes
        if req.weather_conditions is not None:
            meta_updates["weather_conditions"] = req.weather_conditions
        if req.tee_box is not None:
            meta_updates["tee_box_played"] = req.tee_box
        if req.course_name_played is not None:
            meta_updates["course_name_played"] = req.course_name_played

        if meta_updates:
            updated = await db.rounds.update_round(
                str(round_id),
                user_id=str(current_user.id),
                **meta_updates,
            )

        return round_detail(updated, await player_handicap_index(db, current_user))

    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(404, ROUND_NOT_FOUND) from None
    except IntegrityError:
        logger.warning("Update round rejected", exc_info=True)
        raise HTTPException(422, ROUND_CHANGES_INVALID) from None
    except Exception:
        logger.exception("Update round error")
        raise HTTPException(500, ROUND_UPDATE_FAILED) from None


@router.post("/{round_id}/link-course", response_model=RoundSummaryResponse)
async def link_course_to_round(
    round_id: UUID,
    req: LinkCourseRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_round_ownership(round_id, current_user, db)
    try:
        await _check_course_access(req.course_id, current_user, db)

        round_ = await db.rounds.get_round(str(round_id))
        if not round_:
            raise HTTPException(404, ROUND_NOT_FOUND)
        destination_course = await db.courses.get_course(str(req.course_id))
        fill_destination_course = bool(
            destination_course
            and destination_course.user_id
            and str(destination_course.user_id) == str(current_user.id)
        )

        scan_holes = [
            {"hole_number": hs.hole_number, "par": hs.par_played, "handicap": hs.handicap_played}
            for hs in round_.hole_scores
            if hs.hole_number is not None and hs.par_played is not None
        ]
        if scan_holes and fill_destination_course:
            await db.courses.fill_course_gaps(str(req.course_id), scan_holes)

        source_tee_name: Optional[str] = None
        source_slope: Optional[float] = None
        source_rating: Optional[float] = None
        source_yardages: dict = {}

        if round_.user_tee:
            source_tee_name = round_.user_tee.name
            source_slope = round_.user_tee.slope_rating
            source_rating = round_.user_tee.course_rating
            source_yardages = {
                str(k): v
                for k, v in (round_.user_tee.hole_yardages or {}).items()
                if v is not None
            }
        elif round_.course and round_.tee_box:
            tee = round_.course.get_tee(round_.tee_box)
            if tee:
                source_tee_name = tee.color
                source_slope = tee.slope_rating
                source_rating = tee.course_rating
                source_yardages = {
                    str(k): v
                    for k, v in (tee.hole_yardages or {}).items()
                    if v is not None
                }

        if source_tee_name and fill_destination_course:
            await db.courses.fill_course_gaps(
                str(req.course_id),
                [],
                source_tee_name,
                source_slope,
                source_rating,
                source_yardages,
            )

        updated = await db.rounds.link_course_to_round(
            str(round_id),
            str(req.course_id),
            user_id=str(current_user.id),
        )
        if not updated:
            raise HTTPException(404, ROUND_NOT_FOUND)
        return round_summary(updated)
    except HTTPException:
        raise
    except IntegrityError:
        logger.warning("Link course rejected", exc_info=True)
        raise HTTPException(422, ROUND_HOLES_DONT_MATCH_COURSE) from None
    except Exception:
        logger.exception("Link course error")
        raise HTTPException(500, ROUND_LINK_FAILED) from None


@router.delete("/{round_id}", status_code=204)
async def delete_round(
    round_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_round_ownership(round_id, current_user, db)
    await db.rounds.delete_round(str(round_id), user_id=str(current_user.id))
