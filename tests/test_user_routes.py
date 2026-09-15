from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api.routers import users
from database.exceptions import DuplicateError, NotFoundError
from models import UserTee
from tests.helpers import make_course, make_friendship_row, make_mock_database, make_user


def test_create_user_tee_request_normalizes_hole_numbers():
    request = users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400})

    assert request.hole_yardages == {1: 400}


def test_update_user_request_normalizes_plus_handicap():
    assert users.UpdateUserRequest(handicap="+3").handicap == -3


def test_friend_request_normalizes_code():
    request = users.SendFriendRequest(addressee_friend_code=" ab-12 ")

    assert request.addressee_friend_code == "AB-12"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"addressee_user_id": uuid4(), "addressee_friend_code": "ABCD"},
    ],
)
def test_friend_request_rejects_invalid_recipient(payload):
    with pytest.raises(ValidationError):
        users.SendFriendRequest(**payload)


def test_create_user_tee_request_rejects_invalid_hole_number():
    with pytest.raises(ValidationError):
        users.CreateUserTeeRequest(name="Blue", hole_yardages={"bad": 400})


@pytest.fixture
def user_database():
    user_id = uuid4()
    user = make_user(user_id, handicap=12.0)
    db = make_mock_database()
    db.users.get_user_by_email = AsyncMock(return_value=user)
    db.users.get_user = AsyncMock(return_value=user)
    db.users.update_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[])
    return user_id, user, db


@pytest.mark.asyncio
async def test_get_user_by_email_normalizes_lookup(user_database):
    _, user, db = user_database

    result = await users.get_user_by_email("GOLFER@example.com", db, user)

    assert result == user
    db.users.get_user_by_email.assert_awaited_once_with("golfer@example.com")


@pytest.mark.asyncio
async def test_get_user_returns_requested_user(user_database):
    user_id, user, db = user_database

    assert await users.get_user(user_id, db, user) == user


@pytest.mark.asyncio
async def test_get_user_forbids_other_profile(user_database):
    _, user, db = user_database

    with pytest.raises(HTTPException) as raised:
        await users.get_user(uuid4(), db, user)

    assert raised.value.status_code == 403


@pytest.mark.asyncio
async def test_update_user_maps_profile_fields(user_database):
    user_id, user, db = user_database
    course_id = uuid4()
    db.courses.get_course = AsyncMock(return_value=make_course(course_id))
    request = users.UpdateUserRequest(home_course_id=course_id, handicap="+2", scoring_goal=85)

    result = await users.update_user(user_id, request, db, user)

    assert result == user
    assert db.users.update_user.await_args.kwargs == {
        "home_course_id": str(course_id),
        "handicap_index": -2.0,
        "scoring_goal": 85,
    }


@pytest.mark.asyncio
async def test_get_user_handicap_returns_calculated_index(monkeypatch, user_database):
    user_id, user, db = user_database
    monkeypatch.setattr(users.hcap, "handicap_index", lambda *args, **kwargs: 12.0)

    result = await users.get_user_handicap(user_id, db, user)

    assert result == {"handicap_index": 12.0}


@pytest.fixture
def tee_database():
    user_id = uuid4()
    tee_id = uuid4()
    user = make_user(user_id)
    user_tee = UserTee(id=str(tee_id), user_id=str(user_id), name="Blue")
    db = make_mock_database()
    db.user_tees.get_user_tees = AsyncMock(return_value=[user_tee])
    db.user_tees.create_user_tee = AsyncMock(return_value=user_tee)
    db.user_tees.update_user_tee = AsyncMock(return_value=user_tee)
    db.user_tees.delete_user_tee = AsyncMock(return_value=True)
    return user_id, tee_id, user, user_tee, db


@pytest.mark.asyncio
async def test_list_user_tees_returns_repository_tees(tee_database):
    user_id, _, user, user_tee, db = tee_database

    assert await users.get_user_tees(user_id, None, db, user) == [user_tee]


@pytest.mark.asyncio
async def test_create_user_tee_returns_created_tee(tee_database):
    user_id, _, user, user_tee, db = tee_database

    created = await users.create_user_tee(
        user_id,
        users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400}),
        db,
        user,
    )

    assert created == user_tee


@pytest.mark.asyncio
async def test_update_user_tee_returns_updated_tee(tee_database):
    user_id, tee_id, user, user_tee, db = tee_database

    updated = await users.update_user_tee(user_id, tee_id, users.UpdateUserTeeRequest(name="White"), db, user)

    assert updated == user_tee


@pytest.mark.asyncio
async def test_delete_user_tee_delegates_to_repository(tee_database):
    user_id, tee_id, user, _, db = tee_database

    await users.delete_user_tee(user_id, tee_id, db, user)

    db.user_tees.delete_user_tee.assert_awaited_once_with(str(tee_id), user_id=str(user_id))


@pytest.mark.asyncio
async def test_create_user_tee_maps_duplicate_to_conflict(tee_database):
    user_id, _, user, _, db = tee_database
    db.user_tees.create_user_tee.side_effect = DuplicateError()

    with pytest.raises(HTTPException) as raised:
        await users.create_user_tee(user_id, users.CreateUserTeeRequest(name="Blue"), db, user)

    assert raised.value.status_code == 409


@pytest.mark.asyncio
async def test_update_user_tee_maps_missing_tee_to_not_found(tee_database):
    user_id, tee_id, user, _, db = tee_database
    db.user_tees.update_user_tee.side_effect = NotFoundError()

    with pytest.raises(HTTPException) as raised:
        await users.update_user_tee(user_id, tee_id, users.UpdateUserTeeRequest(name="Blue"), db, user)

    assert raised.value.status_code == 404


@pytest.fixture
def friendship_database():
    user_id = uuid4()
    other_id = uuid4()
    user = make_user(user_id)
    record = make_friendship_row(user_id, other_id)
    db = make_mock_database()
    db.users.get_user_by_friend_code = AsyncMock(return_value=make_user(other_id))
    db.friendships.send_request = AsyncMock(return_value=record)
    db.friendships.update_status = AsyncMock(return_value=record)
    db.friendships.list_for_user = AsyncMock(return_value=[record])
    return user_id, other_id, user, record, db


@pytest.mark.asyncio
async def test_send_friend_request_resolves_code_and_returns_record(friendship_database):
    user_id, other_id, user, record, db = friendship_database

    response = await users.send_friend_request(users.SendFriendRequest(addressee_friend_code="ABCD"), db, user)

    assert (response.requester_id, response.addressee_id, response.status) == (
        str(user_id),
        str(other_id),
        "pending",
    )
    db.users.get_user_by_friend_code.assert_awaited_once_with("ABCD")
    db.friendships.send_request.assert_awaited_once_with(str(user_id), str(other_id))


@pytest.mark.asyncio
async def test_update_friendship_status_returns_updated_record(friendship_database):
    user_id, _, user, record, db = friendship_database
    accepted = {**record, "status": "accepted"}
    db.friendships.update_status.return_value = accepted
    db.friendships.list_for_user.return_value = [accepted]

    response = await users.update_friendship_status(
        UUID(str(record["id"])),
        users.FriendshipStatusRequest(status="accepted"),
        db,
        user,
    )

    assert (response.id, response.status) == (str(record["id"]), "accepted")
    db.friendships.update_status.assert_awaited_once_with(str(record["id"]), str(user_id), "accepted")


@pytest.mark.asyncio
async def test_list_friendships_returns_serialized_records(friendship_database):
    user_id, _, user, record, db = friendship_database

    responses = await users.list_friendships(None, db, user)

    assert [(response.id, response.status) for response in responses] == [(str(record["id"]), "pending")]
    db.friendships.list_for_user.assert_awaited_once_with(str(user_id), status=None)
