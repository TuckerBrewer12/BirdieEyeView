import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from database.db_manager import DatabaseManager
from database.exceptions import IntegrityError, NotFoundError
from api.messages import (
    COURSE_NOT_FOUND, FORBIDDEN, ROUND_CHANGES_INVALID, ROUND_HOLES_DONT_MATCH_COURSE, ROUND_NOT_FOUND,
)
from api.error_responses import ROUND_LINK_FAILED, ROUND_UPDATE_FAILED
from api.course_access import load_linkable_course
from api.dependencies import get_current_user, get_db, get_self
from api.request_models import LinkCourseRequest, UpdateRoundRequest
from api.schemas import RoundResponse, RoundSummaryResponse
from models import User
from api.round_responses import round_detail, round_summary, round_list
from analytics.player_history import PlayerHistory
from services.round_service import link_course

logger = logging.getLogger(__name__)

router = APIRouter()

ROUND_FIELDS = {
    "notes": "notes",
    "weather_conditions": "weather_conditions",
    "tee_box": "tee_box_played",
    "course_name_played": "course_name_played",
}


@router.get("/user/{user_id}", response_model=List[RoundSummaryResponse])
async def get_rounds_for_user(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_self),
    db: DatabaseManager = Depends(get_db),
):
    rounds_ = await db.rounds.get_round_summaries_for_user(str(user.id), limit=limit, offset=offset)
    return round_list(rounds_)


async def _check_round_ownership(round_id: UUID, current_user: User, db: DatabaseManager):
    owner_id = await db.rounds.get_round_owner_id(str(round_id))
    if owner_id is None:
        raise HTTPException(404, ROUND_NOT_FOUND)
    if owner_id != str(current_user.id):
        raise HTTPException(403, FORBIDDEN)


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
    return round_detail(round_, (await PlayerHistory.load(db.rounds, current_user)).handicap_index)


@router.put("/{round_id}", response_model=RoundResponse)
async def update_round(
    round_id: UUID,
    req: UpdateRoundRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _check_round_ownership(round_id, current_user, db)
    hole_changes = {
        hs.hole_number: hs.model_dump(include=hs.model_fields_set) for hs in (req.hole_scores or [])
    }
    fields = {column: getattr(req, name) for name, column in ROUND_FIELDS.items() if name in req.model_fields_set}
    try:
        updated = await db.rounds.edit_round(
            str(round_id), user_id=str(current_user.id), hole_changes=hole_changes, fields=fields
        )
        if not updated:
            raise HTTPException(404, ROUND_NOT_FOUND)
        return round_detail(updated, (await PlayerHistory.load(db.rounds, current_user)).handicap_index)
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
        course = await load_linkable_course(
            db, req.course_id, str(current_user.id), missing_detail=COURSE_NOT_FOUND, missing_status=404
        )
        updated = await link_course(db, str(round_id), course, str(current_user.id))
        return round_summary(updated)
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(404, ROUND_NOT_FOUND) from None
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
