import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import asyncpg
import pytest

from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from database.repositories.course_repo import CourseRepositoryDB, _tee_yardage_similarity
from database.repositories.friendship_repo import FriendshipRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from models import Course, Hole, HoleScore, Round, Tee, User, UserTee
from tests.helpers import make_round


def _make_user_row(**overrides):
    user_row = {
        "id": uuid4(),
        "friend_code": "GCABCDEFGH",
        "name": "Ada",
        "email": "ada@example.com",
        "email_verified": True,
        "email_verified_at": None,
        "home_course_id": None,
        "handicap_index": 8.2,
        "created_at": None,
        "last_handicap_update": None,
        "scoring_goal": 89,
    }
    user_row.update(overrides)
    return user_row


def _make_user_tee_row(**overrides):
    user_tee_row = {
        "id": uuid4(),
        "user_id": uuid4(),
        "course_id": None,
        "name": "Blue",
        "slope_rating": 125,
        "course_rating": 72.1,
        "hole_yardages": {"1": 400},
        "created_at": None,
    }
    user_tee_row.update(overrides)
    return user_tee_row


def _make_friendship():
    return {
        "id": uuid4(),
        "requester_id": uuid4(),
        "addressee_id": uuid4(),
        "status": "pending",
    }


@pytest.mark.asyncio
async def test_user_repository_maps_schema_email_constraint_to_duplicate_error(mock_pool):
    pool, conn = mock_pool
    duplicate_email = asyncpg.UniqueViolationError("duplicate email")
    duplicate_email.constraint_name = "users_email_key"
    conn.fetchrow.side_effect = duplicate_email

    with pytest.raises(DuplicateError, match="Email already in use"):
        await UserRepositoryDB(pool).create_user(
            User(name="Ada", email="ada@example.com"),
            password_hash="hash",
        )


@pytest.mark.asyncio
async def test_authentication_never_bypasses_missing_verification_schema(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = asyncpg.UndefinedColumnError('email_verified is missing')
    with pytest.raises(IntegrityError, match='Authentication schema is unavailable'):
        await UserRepositoryDB(pool).get_auth_user_by_email('ada@example.com')
    conn.fetchrow.assert_awaited_once()


@pytest.mark.asyncio
async def test_user_repository_update_converts_uuid_and_json_fields(mock_pool):
    pool, conn = mock_pool
    user_repository = UserRepositoryDB(pool)
    user_id = str(uuid4())
    home_course_id = str(uuid4())
    conn.fetchrow.return_value = _make_user_row()

    await user_repository.update_user(
        user_id,
        name="Grace",
        home_course_id=home_course_id,
        preferences={"distance_unit": "yards"},
    )

    _, *query_values = conn.fetchrow.await_args.args
    assert query_values[:3] == [UUID(user_id), "Grace", UUID(home_course_id)]
    assert json.loads(query_values[3]) == {"distance_unit": "yards"}


@pytest.mark.asyncio
async def test_user_repository_update_ignores_unknown_fields(mock_pool):
    pool, _ = mock_pool
    user_id = str(uuid4())
    user_repository = UserRepositoryDB(pool)
    user_repository.get_user = AsyncMock(return_value=User(id=user_id, name="Ada"))

    updated = await user_repository.update_user(user_id, ignored=True)

    assert updated.id == user_id


@pytest.mark.parametrize(
    ("method_name", "arguments"),
    [
        ("update_handicap", (4.2,)),
        ("set_password_hash", ("new-hash",)),
        ("mark_email_verified", ()),
    ],
)
@pytest.mark.asyncio
async def test_user_repository_account_mutation_rejects_missing_user(
    mock_pool,
    method_name,
    arguments,
):
    pool, conn = mock_pool
    conn.execute.return_value = "UPDATE 0"

    with pytest.raises(NotFoundError):
        await getattr(UserRepositoryDB(pool), method_name)(str(uuid4()), *arguments)


@pytest.mark.asyncio
async def test_friendship_repository_rejects_self_request(mock_pool):
    pool, _ = mock_pool
    user_id = str(uuid4())

    with pytest.raises(ValueError, match="yourself"):
        await FriendshipRepositoryDB(pool).send_request(user_id, user_id)


@pytest.mark.parametrize("status", ["accepted", "blocked"])
@pytest.mark.asyncio
async def test_friendship_repository_rejects_closed_pair(mock_pool, status):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetchrow.return_value = {**friendship, "status": status}

    with pytest.raises(DuplicateError):
        await FriendshipRepositoryDB(pool).send_request(
            str(friendship["requester_id"]),
            str(friendship["addressee_id"]),
        )


@pytest.mark.asyncio
async def test_friendship_repository_rejects_invalid_status(mock_pool):
    pool, _ = mock_pool

    with pytest.raises(ValueError, match="Invalid status"):
        await FriendshipRepositoryDB(pool).update_status(
            str(uuid4()),
            str(uuid4()),
            "unknown",
        )


@pytest.mark.parametrize(
    ("status", "actor"),
    [("declined", "requester"), ("blocked", "outsider")],
)
@pytest.mark.asyncio
async def test_friendship_repository_rejects_unauthorized_status_update(
    mock_pool,
    status,
    actor,
):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetchrow.return_value = friendship
    actor_id = friendship["requester_id"] if actor == "requester" else uuid4()

    updated = await FriendshipRepositoryDB(pool).update_status(
        str(friendship["id"]),
        str(actor_id),
        status,
    )

    assert updated is None


@pytest.mark.asyncio
async def test_user_tee_repository_update_serializes_yardages(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = _make_user_tee_row()

    await UserTeeRepositoryDB(pool).update_user_tee(
        str(uuid4()),
        user_id=str(uuid4()),
        name="Gold",
        hole_yardages={1: 390},
    )

    update = next(call.args for call in conn.execute.await_args_list if 'UPDATE users.user_tees' in call.args[0])
    assert json.loads(update[5]) == {"1": 390}


@pytest.mark.asyncio
async def test_user_tee_repository_update_ignores_unknown_fields(mock_pool):
    pool, _ = mock_pool
    existing = UserTee(user_id=str(uuid4()), name="Blue")
    repository = UserTeeRepositoryDB(pool)
    repository.get_user_tee = AsyncMock(return_value=existing)

    updated = await repository.update_user_tee(str(uuid4()), ignored=True)

    assert updated == existing


@pytest.mark.asyncio
async def test_user_tee_repository_update_rejects_missing_tee(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await UserTeeRepositoryDB(pool).update_user_tee(str(uuid4()), name="Gold")


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ({}, {1: 400}, (0.0, 0)),
        ({1: 400}, {2: 400}, (0.0, 0)),
        ({1: 400}, {1: 420}, (1.0, 1)),
    ],
)
def test_tee_yardage_similarity(left, right, expected):
    assert _tee_yardage_similarity(left, right) == expected


@pytest.mark.asyncio
async def test_round_repository_rejects_invalid_owner_id(mock_pool):
    pool, _ = mock_pool

    owner_id = await RoundRepositoryDB(pool, AsyncMock()).get_round_owner_id("invalid")

    assert owner_id is None


@pytest.mark.asyncio
async def test_round_repository_upsert_score_rejects_missing_round(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await RoundRepositoryDB(pool, AsyncMock()).upsert_hole_score(
            str(uuid4()),
            HoleScore(hole_number=1, strokes=4),
        )


