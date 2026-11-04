from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api.routers import users
from database.exceptions import ConflictError, DuplicateError, NotFoundError
from models import UserTee
from tests.helpers import make_course, make_friendship_row, make_mock_database, make_user


def test_create_user_tee_request_normalizes_hole_numbers():
    request = users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400})

    assert request.hole_yardages == {1: 400}


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
async def test_delete_user_tee_delegates_to_repository(tee_database):
    user_id, tee_id, user, _, db = tee_database

    await users.delete_user_tee(user_id, tee_id, db, user)

    db.user_tees.delete_user_tee.assert_awaited_once_with(str(tee_id), user_id=str(user_id))


@pytest.mark.asyncio
async def test_delete_referenced_user_tee_returns_clear_conflict(tee_database):
    user_id, tee_id, user, _, db = tee_database
    db.user_tees.delete_user_tee.side_effect = ConflictError('Used by past rounds')
    with pytest.raises(HTTPException) as raised:
        await users.delete_user_tee(user_id, tee_id, db, user)
    assert raised.value.status_code == 409
    assert 'past rounds' in raised.value.detail


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


# ================================================================
# API domain: goals, course access and error translation
# ================================================================


@pytest.mark.parametrize(("field", "value"), [("scoring_goal", 18), ("scoring_goal", 270), ("scoring_goal_nine", 9), ("scoring_goal_nine", 135)])
def test_update_user_request_accepts_domain_goal_bounds(field, value):
    assert getattr(users.UpdateUserRequest(**{field: value}), field) == value


@pytest.mark.parametrize(("field", "value"), [("scoring_goal", 17), ("scoring_goal", 271), ("scoring_goal_nine", 8), ("scoring_goal_nine", 136)])
def test_update_user_request_rejects_goals_outside_domain_bounds(field, value):
    with pytest.raises(ValidationError):
        users.UpdateUserRequest(**{field: value})


def test_user_tee_request_omits_unknown_yardages():
    assert users.CreateUserTeeRequest(name="Blue", hole_yardages={"1": 400, "2": None}).hole_yardages == {1: 400}


@pytest.mark.parametrize("yardages", [{"1": [400]}, {"1": 350.9}, {"01": 350, "1": 400}])
def test_user_tee_request_rejects_malformed_yardages(yardages):
    with pytest.raises(ValidationError):
        users.CreateUserTeeRequest(name="Blue", hole_yardages=yardages)


@pytest.mark.asyncio
@pytest.mark.parametrize("owner", ["master", "self"], ids=["master-course", "own-private-course"])
async def test_create_user_tee_links_accessible_courses(tee_database, owner):
    # Another user's private course is rejected over HTTP in test_api_http_contracts.py.
    user_id, _, user, user_tee, db = tee_database
    course_id = uuid4()
    db.courses.get_course = AsyncMock(return_value=make_course(course_id, owner=user_id if owner == "self" else None))
    request = users.CreateUserTeeRequest(name="Blue", course_id=course_id)

    assert await users.create_user_tee(user_id, request, db, user) == user_tee
    assert db.user_tees.create_user_tee.await_args.args[0].course_id == str(course_id)


@pytest.mark.asyncio
async def test_create_user_tee_rejects_missing_course(tee_database):
    user_id, _, user, _, db = tee_database
    db.courses.get_course = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as raised:
        await users.create_user_tee(user_id, users.CreateUserTeeRequest(name="Blue", course_id=uuid4()), db, user)

    assert raised.value.status_code == 400


@pytest.mark.asyncio
async def test_update_user_tee_maps_duplicate_to_conflict(tee_database):
    user_id, tee_id, user, _, db = tee_database
    db.user_tees.update_user_tee.side_effect = DuplicateError()

    with pytest.raises(HTTPException) as raised:
        await users.update_user_tee(user_id, tee_id, users.UpdateUserTeeRequest(name="White"), db, user)

    assert raised.value.status_code == 409


@pytest.mark.asyncio
async def test_friend_request_to_unknown_user_is_not_found(friendship_database):
    _, _, user, _, db = friendship_database
    db.users.get_user = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as raised:
        await users.send_friend_request(users.SendFriendRequest(addressee_user_id=uuid4()), db, user)

    assert raised.value.status_code == 404
    db.friendships.send_request.assert_not_awaited()


@pytest.mark.asyncio
async def test_user_tee_rating_records_the_linked_course_layout(tee_database):
    from models import Course, Hole

    user_id, _, user, _, db = tee_database
    db.courses.get_course = AsyncMock(return_value=Course(
        id=str(uuid4()), name="Master", total_holes=18, holes=[Hole(number=n, par=4) for n in range(1, 19)]
    ))
    request = users.CreateUserTeeRequest(name="Blue", course_id=uuid4(), course_rating=71.4, slope_rating=128)

    await users.create_user_tee(user_id, request, db, user)

    assert db.user_tees.create_user_tee.await_args.args[0].rating_holes == tuple(range(1, 19))
