"""User API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from database.db_manager import DatabaseManager
from database.exceptions import ConflictError, DuplicateError, IntegrityError, NotFoundError
from api.messages import (
    FORBIDDEN, FRIENDSHIP_NOT_FOUND, FRIEND_CODE_NOT_FOUND, HOME_COURSE_NOT_FOUND, LINKED_COURSE_NOT_FOUND,
    USER_NOT_FOUND, USER_TEE_EXISTS, USER_TEE_IN_USE, USER_TEE_NAME_TAKEN, USER_TEE_NOT_FOUND,
)
from api.course_access import load_linkable_course
from api.dependencies import get_current_user, get_db
from api.input_validation import normalize_email
from api.request_models import (
    CreateUserTeeRequest,
    FriendshipStatusRequest,
    SendFriendRequest,
    UpdateUserRequest,
    UpdateUserTeeRequest,
)
from api.schemas import FriendshipResponse, UserResponse, UserTeeResponse
from models import User, UserTee
from models.hole_layout import rated_coverage
from analytics import handicap as hcap

router = APIRouter()


def _friendship_row_to_response(row: dict) -> FriendshipResponse:
    return FriendshipResponse(
        id=str(row["id"]),
        requester_id=str(row["requester_id"]),
        addressee_id=str(row["addressee_id"]),
        status=row["status"],
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else "",
        requester_name=row.get("requester_name"),
        requester_email=row.get("requester_email"),
        addressee_name=row.get("addressee_name"),
        addressee_email=row.get("addressee_email"),
    )


@router.get("/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(
    email: str,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        normalized_email = normalize_email(email)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if normalized_email != (current_user.email or "").lower():
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    req: UpdateUserRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)

    updates = req.model_dump(exclude_unset=True)
    if "home_course_id" in updates and updates["home_course_id"] is not None:
        home_course_id = str(updates["home_course_id"])
        await load_linkable_course(
            db, home_course_id, str(current_user.id), missing_detail=HOME_COURSE_NOT_FOUND
        )
        updates["home_course_id"] = home_course_id
    if "handicap" in updates:
        updates["handicap_index"] = updates.pop("handicap")
    user = await db.users.update_user(str(user_id), **updates)
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)
    return user


@router.get("/{user_id}/handicap")
async def get_user_handicap(
    user_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's current WHS-based Handicap Index estimate."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    user = await db.users.get_user(str(user_id))
    if not user:
        raise HTTPException(404, USER_NOT_FOUND)
    history = await db.rounds.get_rounds_for_user(str(user_id), limit=None)
    return {"handicap_index": hcap.user_handicap_index(history, user)}


# ================================================================
# User tees
# ================================================================

@router.get("/{user_id}/tees", response_model=List[UserTeeResponse])
async def get_user_tees(
    user_id: UUID,
    course_id: Optional[UUID] = Query(None),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List a user's custom tee configurations."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    return await db.user_tees.get_user_tees(str(user_id), course_id=str(course_id) if course_id else None)


@router.post("/{user_id}/tees", response_model=UserTeeResponse, status_code=201)
async def create_user_tee(
    user_id: UUID,
    req: CreateUserTeeRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a user tee configuration."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    linked = None
    if req.course_id:
        linked = await load_linkable_course(
            db, req.course_id, str(current_user.id), missing_detail=LINKED_COURSE_NOT_FOUND
        )
    layout = linked.get_expected_holes() if linked is not None else None
    tee = UserTee(
        user_id=str(user_id),
        course_id=str(req.course_id) if req.course_id else None,
        name=req.name,
        slope_rating=req.slope_rating,
        course_rating=req.course_rating,
        rating_holes=rated_coverage(layout, req.course_rating, req.slope_rating),
        hole_yardages=(req.hole_yardages or {}),
    )
    try:
        return await db.user_tees.create_user_tee(tee)
    except DuplicateError:
        raise HTTPException(409, USER_TEE_EXISTS.format(name=req.name))
    except IntegrityError as error:
        raise HTTPException(422, str(error)) from error


@router.put("/{user_id}/tees/{tee_id}", response_model=UserTeeResponse)
async def update_user_tee(
    user_id: UUID,
    tee_id: UUID,
    req: UpdateUserTeeRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a user tee configuration."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    updates = req.model_dump(exclude_none=True)
    try:
        tee = await db.user_tees.update_user_tee(str(tee_id), user_id=str(user_id), **updates)
    except NotFoundError:
        raise HTTPException(404, USER_TEE_NOT_FOUND)
    except DuplicateError as error:
        raise HTTPException(409, USER_TEE_NAME_TAKEN) from error
    except IntegrityError as error:
        raise HTTPException(422, str(error)) from error
    # An empty update is a lookup, which returns None instead of raising for a missing tee.
    if tee is None:
        raise HTTPException(404, USER_TEE_NOT_FOUND)
    return tee


@router.delete("/{user_id}/tees/{tee_id}", status_code=204)
async def delete_user_tee(
    user_id: UUID,
    tee_id: UUID,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a user tee configuration."""
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    try:
        deleted = await db.user_tees.delete_user_tee(str(tee_id), user_id=str(user_id))
    except ConflictError as error:
        raise HTTPException(409, USER_TEE_IN_USE) from error
    if not deleted:
        raise HTTPException(404, USER_TEE_NOT_FOUND)


# ================================================================
# Friendships
# ================================================================

@router.post("/me/friends", response_model=FriendshipResponse, status_code=201)
async def send_friend_request(
    req: SendFriendRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send (or re-open) a friend request to another user."""
    addressee_user_id: Optional[str] = str(req.addressee_user_id) if req.addressee_user_id else None
    addressee_friend_code = (req.addressee_friend_code or "").strip().upper()

    if addressee_friend_code:
        target_user = await db.users.get_user_by_friend_code(addressee_friend_code)
        if not target_user or not target_user.id:
            raise HTTPException(404, FRIEND_CODE_NOT_FOUND)
        addressee_user_id = str(target_user.id)
    elif not await db.users.get_user(str(addressee_user_id)):
        raise HTTPException(404, USER_NOT_FOUND)

    try:
        row = await db.friendships.send_request(str(current_user.id), str(addressee_user_id))
        rows = await db.friendships.list_for_user(str(current_user.id))
        match = next((r for r in rows if str(r["id"]) == str(row["id"])), row)
        return _friendship_row_to_response(match)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except DuplicateError as e:
        raise HTTPException(409, str(e))


@router.patch("/me/friends/{friendship_id}", response_model=FriendshipResponse)
async def update_friendship_status(
    friendship_id: UUID,
    req: FriendshipStatusRequest,
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept/decline/block a friendship request."""
    try:
        updated = await db.friendships.update_status(
            str(friendship_id), str(current_user.id), req.status
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not updated:
        raise HTTPException(404, FRIENDSHIP_NOT_FOUND)

    rows = await db.friendships.list_for_user(str(current_user.id))
    match = next((r for r in rows if str(r["id"]) == str(updated["id"])), updated)
    return _friendship_row_to_response(match)


@router.get("/me/friends", response_model=List[FriendshipResponse])
async def list_friendships(
    status: Optional[str] = Query(None, pattern="^(pending|accepted|declined|blocked)$"),
    db: DatabaseManager = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List friendships for the current user."""
    rows = await db.friendships.list_for_user(str(current_user.id), status=status)
    return [_friendship_row_to_response(r) for r in rows]
