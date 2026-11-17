import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from database.db_manager import DatabaseManager
from database.exceptions import (
    AlreadyFriendsError, ConflictError, DuplicateError, FriendRequestBlockedError, IntegrityError, NotFoundError,
    RequestAlreadySentError, RequestAwaitingYouError, YouBlockedError,
)
from api.messages import (
    CANNOT_FRIEND_YOURSELF, FRIEND_CODE_NOT_FOUND, FRIEND_REQUEST_ALREADY_SENT, FRIEND_REQUEST_AWAITING_YOU,
    FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR, FRIEND_UNBLOCK_FIRST, FRIENDSHIP_NOT_FOUND, HOME_COURSE_NOT_FOUND,
    INVALID_FRIENDSHIP_STATUS, LINKED_COURSE_NOT_FOUND, USER_NOT_FOUND, USER_TEE_EXISTS, USER_TEE_IN_USE,
    USER_TEE_INVALID, USER_TEE_NAME_TAKEN, USER_TEE_NOT_FOUND, USER_TEE_OUTSIDE_COURSE, USERS_ARE_ALREADY_FRIENDS,
)
from api.course_access import load_linkable_course
from api.dependencies import get_current_user, get_db, get_self
from api.friendship_responses import friendship_list, friendship_response
from api.request_models import (
    CreateUserTeeRequest,
    FriendshipStatusRequest,
    SendFriendRequest,
    UpdateUserRequest,
    UpdateUserTeeRequest,
)
from api.schemas import FriendshipResponse, UserResponse, UserTeeResponse
from models import User
from services import user_tee_service
from services.user_tee_service import TeeOutsideCourseLayout

router = APIRouter()
logger = logging.getLogger(__name__)

FRIEND_REQUEST_CONFLICTS = (
    (AlreadyFriendsError, USERS_ARE_ALREADY_FRIENDS),
    (RequestAlreadySentError, FRIEND_REQUEST_ALREADY_SENT),
    (RequestAwaitingYouError, FRIEND_REQUEST_AWAITING_YOU),
    (YouBlockedError, FRIEND_UNBLOCK_FIRST),
    (FriendRequestBlockedError, FRIEND_REQUEST_BLOCKED_FOR_THIS_PAIR),
)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    found = await db.users.get_user(str(user.id))
    if not found:
        raise HTTPException(404, USER_NOT_FOUND)
    return found


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    req: UpdateUserRequest,
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    updates = req.model_dump(exclude_unset=True)
    if updates.get("home_course_id") is not None:
        home_course_id = str(updates["home_course_id"])
        await load_linkable_course(
            db, home_course_id, str(user.id), missing_detail=HOME_COURSE_NOT_FOUND
        )
        updates["home_course_id"] = home_course_id
    if "handicap" in updates:
        updates["handicap_index"] = updates.pop("handicap")
    updated = await db.users.update_user(str(user.id), **updates)
    if not updated:
        raise HTTPException(404, USER_NOT_FOUND)
    return updated


@router.get("/{user_id}/tees", response_model=List[UserTeeResponse])
async def get_user_tees(
    course_id: Optional[UUID] = Query(None),
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    return await db.user_tees.get_user_tees(str(user.id), course_id=str(course_id) if course_id else None)


@router.post("/{user_id}/tees", response_model=UserTeeResponse, status_code=201)
async def create_user_tee(
    req: CreateUserTeeRequest,
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    linked = None
    if req.course_id:
        linked = await load_linkable_course(
            db, req.course_id, str(user.id), missing_detail=LINKED_COURSE_NOT_FOUND
        )
    try:
        return await user_tee_service.create_user_tee(db, str(user.id), req.model_dump(), linked)
    except TeeOutsideCourseLayout:
        raise HTTPException(422, USER_TEE_OUTSIDE_COURSE) from None
    except DuplicateError:
        raise HTTPException(409, USER_TEE_EXISTS.format(name=req.name)) from None
    except IntegrityError as error:
        logger.info("User tee rejected: %s", error)
        raise HTTPException(422, USER_TEE_INVALID) from error


@router.put("/{user_id}/tees/{tee_id}", response_model=UserTeeResponse)
async def update_user_tee(
    tee_id: UUID,
    req: UpdateUserTeeRequest,
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    try:
        tee = await user_tee_service.update_user_tee(
            db, str(user.id), str(tee_id), req.model_dump(exclude_unset=True)
        )
    except TeeOutsideCourseLayout:
        raise HTTPException(422, USER_TEE_OUTSIDE_COURSE) from None
    except NotFoundError:
        raise HTTPException(404, USER_TEE_NOT_FOUND) from None
    except DuplicateError as error:
        raise HTTPException(409, USER_TEE_NAME_TAKEN) from error
    except IntegrityError as error:
        logger.info("User tee rejected: %s", error)
        raise HTTPException(422, USER_TEE_INVALID) from error
    if tee is None:
        raise HTTPException(404, USER_TEE_NOT_FOUND)
    return tee


@router.delete("/{user_id}/tees/{tee_id}", status_code=204)
async def delete_user_tee(
    tee_id: UUID,
    db: DatabaseManager = Depends(get_db),
    user: User = Depends(get_self),
):
    try:
        deleted = await db.user_tees.delete_user_tee(str(tee_id), user_id=str(user.id))
    except ConflictError as error:
        raise HTTPException(409, USER_TEE_IN_USE) from error
    if not deleted:
        raise HTTPException(404, USER_TEE_NOT_FOUND)


@router.post("/me/friends", response_model=FriendshipResponse, status_code=201)
async def send_friend_request(
    req: SendFriendRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = await db.users.get_user_by_friend_code(req.addressee_friend_code)
    if not target or not target.id:
        raise HTTPException(404, FRIEND_CODE_NOT_FOUND)
    try:
        row = await db.friendships.send_request(str(current_user.id), str(target.id))
    except ValueError:
        raise HTTPException(400, CANNOT_FRIEND_YOURSELF) from None
    except DuplicateError as error:
        detail = next(message for kind, message in FRIEND_REQUEST_CONFLICTS if isinstance(error, kind))
        raise HTTPException(409, detail) from None
    return friendship_response(row)


@router.patch("/me/friends/{friendship_id}", response_model=FriendshipResponse)
async def update_friendship_status(
    friendship_id: UUID,
    req: FriendshipStatusRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated = await db.friendships.update_status(str(friendship_id), str(current_user.id), req.status)
    except ValueError:
        raise HTTPException(400, INVALID_FRIENDSHIP_STATUS) from None
    if not updated:
        raise HTTPException(404, FRIENDSHIP_NOT_FOUND)
    return friendship_response(updated)


@router.delete("/me/friends/{friendship_id}", status_code=204)
async def remove_friendship(
    friendship_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not await db.friendships.remove(str(friendship_id), str(current_user.id)):
        raise HTTPException(404, FRIENDSHIP_NOT_FOUND)


@router.get("/me/friends", response_model=List[FriendshipResponse])
async def list_friendships(
    status: Optional[str] = Query(None, pattern="^(pending|accepted|declined|blocked)$"),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    viewer = str(current_user.id)
    rows = await db.friendships.list_for_user(viewer, status=status)
    return await friendship_list(db, rows, viewer)
