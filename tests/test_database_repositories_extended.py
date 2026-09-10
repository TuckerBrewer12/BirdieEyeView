import json
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import asyncpg
import pytest

from database.exceptions import DuplicateError, NotFoundError
from database.repositories.course_repo import CourseRepositoryDB, _tee_yardage_similarity
from database.repositories.friendship_repo import FriendshipRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from models import Course, Hole, HoleScore, Tee, User, UserTee


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
async def test_user_repository_reads_user_by_id_and_normalized_email(mock_pool):
    pool, conn = mock_pool
    user_repository = UserRepositoryDB(pool)
    conn.fetchrow.return_value = _make_user_row()

    user_by_id = await user_repository.get_user(str(uuid4()))
    user_by_email = await user_repository.get_user_by_email(" ADA@EXAMPLE.COM ")

    assert user_by_id.name == "Ada"
    assert user_by_email.email == "ada@example.com"


@pytest.mark.asyncio
async def test_user_repository_reads_present_and_missing_password_hash(mock_pool):
    pool, conn = mock_pool
    user_repository = UserRepositoryDB(pool)
    conn.fetchrow.side_effect = [{"password_hash": "hash"}, None]

    present = await user_repository.get_password_hash(" ADA@EXAMPLE.COM ")
    missing = await user_repository.get_password_hash("missing@example.com")

    assert present == "hash"
    assert missing is None


@pytest.mark.asyncio
async def test_user_repository_reads_authentication_fields(mock_pool):
    pool, conn = mock_pool
    user_id = uuid4()
    conn.fetchrow.return_value = {
        "id": user_id,
        "name": "Ada",
        "email": "ada@example.com",
        "password_hash": "hash",
        "email_verified": True,
    }

    auth_user = await UserRepositoryDB(pool).get_auth_user_by_email("ADA@example.com")

    assert auth_user == {
        "id": str(user_id),
        "name": "Ada",
        "email": "ada@example.com",
        "password_hash": "hash",
        "email_verified": True,
    }


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
async def test_user_repository_update_sets_handicap_timestamp(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = _make_user_row()

    await UserRepositoryDB(pool).update_user(str(uuid4()), handicap_index=7.1)

    update_query = conn.fetchrow.await_args.args[0]
    assert "last_handicap_update = NOW()" in update_query


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
async def test_user_repository_account_mutation_executes_update(
    mock_pool,
    method_name,
    arguments,
):
    pool, conn = mock_pool
    conn.execute.return_value = "UPDATE 1"

    await getattr(UserRepositoryDB(pool), method_name)(str(uuid4()), *arguments)

    conn.execute.assert_awaited_once()


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
async def test_user_repository_create_auth_token_invalidates_previous_token(mock_pool):
    pool, conn = mock_pool

    await UserRepositoryDB(pool).create_auth_token(
        str(uuid4()),
        "email_verify",
        "token-hash",
        datetime.now(timezone.utc),
    )

    assert conn.execute.await_count == 2


@pytest.mark.asyncio
async def test_user_repository_consume_auth_token_handles_present_and_missing(mock_pool):
    pool, conn = mock_pool
    token_user_id = uuid4()
    conn.fetchrow.side_effect = [{"user_id": token_user_id}, None]
    user_repository = UserRepositoryDB(pool)

    present = await user_repository.consume_auth_token("email_verify", "token-hash")
    missing = await user_repository.consume_auth_token("email_verify", "missing")

    assert present == str(token_user_id)
    assert missing is None


@pytest.mark.asyncio
async def test_user_repository_recent_auth_token_handles_present_and_missing(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = [{"id": uuid4()}, None]
    user_repository = UserRepositoryDB(pool)
    minimum_created_at = datetime.now(timezone.utc)

    present = await user_repository.has_recent_auth_token(
        str(uuid4()),
        "email_verify",
        minimum_created_at,
    )
    missing = await user_repository.has_recent_auth_token(
        str(uuid4()),
        "email_verify",
        minimum_created_at,
    )

    assert present is True
    assert missing is False


@pytest.mark.parametrize(("delete_result", "expected"), [("DELETE 1", True), ("DELETE 0", False)])
@pytest.mark.asyncio
async def test_user_repository_delete_reports_whether_user_existed(
    mock_pool,
    delete_result,
    expected,
):
    pool, conn = mock_pool
    conn.execute.return_value = delete_result

    deleted = await UserRepositoryDB(pool).delete_user(str(uuid4()))

    assert deleted is expected


@pytest.mark.asyncio
async def test_friendship_repository_rejects_self_request(mock_pool):
    pool, _ = mock_pool
    user_id = str(uuid4())

    with pytest.raises(ValueError, match="yourself"):
        await FriendshipRepositoryDB(pool).send_request(user_id, user_id)


@pytest.mark.asyncio
async def test_friendship_repository_creates_pending_request(mock_pool):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetchrow.side_effect = [None, friendship]

    created = await FriendshipRepositoryDB(pool).send_request(
        str(friendship["requester_id"]),
        str(friendship["addressee_id"]),
    )

    assert created["status"] == "pending"


@pytest.mark.asyncio
async def test_friendship_repository_reopens_existing_request(mock_pool):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetchrow.side_effect = [friendship, friendship]

    reopened = await FriendshipRepositoryDB(pool).send_request(
        str(friendship["requester_id"]),
        str(friendship["addressee_id"]),
    )

    assert reopened["id"] == friendship["id"]


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


@pytest.mark.asyncio
async def test_friendship_repository_returns_none_for_missing_friendship(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    updated = await FriendshipRepositoryDB(pool).update_status(
        str(uuid4()),
        str(uuid4()),
        "accepted",
    )

    assert updated is None


@pytest.mark.asyncio
async def test_friendship_repository_accepts_request_for_addressee(mock_pool):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetchrow.side_effect = [friendship, {**friendship, "status": "accepted"}]

    updated = await FriendshipRepositoryDB(pool).update_status(
        str(friendship["id"]),
        str(friendship["addressee_id"]),
        "accepted",
    )

    assert updated["status"] == "accepted"


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


@pytest.mark.parametrize("status", ["pending", None])
@pytest.mark.asyncio
async def test_friendship_repository_lists_friendships(mock_pool, status):
    pool, conn = mock_pool
    friendship = _make_friendship()
    conn.fetch.return_value = [friendship]

    listed = await FriendshipRepositoryDB(pool).list_for_user(
        str(friendship["requester_id"]),
        status=status,
    )

    assert listed == [friendship]


@pytest.mark.asyncio
async def test_friendship_repository_treats_user_as_own_friend(mock_pool):
    pool, _ = mock_pool
    user_id = str(uuid4())

    are_friends = await FriendshipRepositoryDB(pool).are_friends(user_id, user_id)

    assert are_friends is True


@pytest.mark.asyncio
async def test_friendship_repository_finds_accepted_friendship(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"exists": 1}

    are_friends = await FriendshipRepositoryDB(pool).are_friends(
        str(uuid4()),
        str(uuid4()),
    )

    assert are_friends is True


@pytest.mark.parametrize("course_id", [None, "course"])
@pytest.mark.asyncio
async def test_user_tee_repository_lists_tees(mock_pool, course_id):
    pool, conn = mock_pool
    user_tee_row = _make_user_tee_row()
    conn.fetch.return_value = [user_tee_row]
    course_uuid = str(uuid4()) if course_id else None

    listed = await UserTeeRepositoryDB(pool).get_user_tees(
        str(uuid4()),
        course_id=course_uuid,
    )

    assert [tee.name for tee in listed] == ["Blue"]


@pytest.mark.asyncio
async def test_user_tee_repository_gets_owner_scoped_tee(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = _make_user_tee_row()

    user_tee = await UserTeeRepositoryDB(pool).get_user_tee(
        str(uuid4()),
        user_id=str(uuid4()),
    )

    assert user_tee.name == "Blue"


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

    assert json.loads(conn.fetchrow.await_args.args[3]) == {"1": 390}


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


@pytest.mark.asyncio
async def test_user_tee_repository_delete_reports_whether_tee_existed(mock_pool):
    pool, conn = mock_pool
    conn.execute.return_value = "DELETE 1"

    deleted = await UserTeeRepositoryDB(pool).delete_user_tee(
        str(uuid4()),
        user_id=str(uuid4()),
    )

    assert deleted is True


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


@pytest.mark.parametrize(
    ("location", "user_id"),
    [("CA", "user"), ("CA", None), (None, "user"), (None, None)],
)
@pytest.mark.asyncio
async def test_course_repository_finds_course_with_optional_filters(
    mock_pool,
    location,
    user_id,
):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    conn.fetchrow.return_value = {"id": uuid4(), "user_id": user_id}
    repository._assemble = AsyncMock(return_value=course)
    owner_id = str(uuid4()) if user_id else None

    found = await repository.find_course_by_name("Pebble", location, owner_id)

    assert found == course


@pytest.mark.asyncio
async def test_course_repository_uses_fuzzy_name_fallback(mock_pool):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    conn.fetchrow.side_effect = [None, None, {"id": uuid4(), "user_id": None}]
    repository._assemble = AsyncMock(return_value=course)

    found = await repository.find_course_by_name("Pebble")

    assert found == course


@pytest.mark.asyncio
async def test_course_repository_returns_none_for_missing_name(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    found = await CourseRepositoryDB(pool).find_course_by_name("Missing")

    assert found is None


@pytest.mark.parametrize("user_scoped", [True, False])
@pytest.mark.asyncio
async def test_course_repository_lists_courses(mock_pool, user_scoped):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    conn.fetch.return_value = [{"id": uuid4(), "user_id": None}]
    repository._assemble = AsyncMock(return_value=course)

    courses = await repository.list_courses(
        user_id=str(uuid4()) if user_scoped else None
    )

    assert courses == [course]


@pytest.mark.parametrize("user_scoped", [True, False])
@pytest.mark.asyncio
async def test_course_repository_searches_courses(mock_pool, user_scoped):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    conn.fetch.return_value = [{"id": uuid4(), "user_id": None}]
    repository._assemble = AsyncMock(return_value=course)

    courses = await repository.search_courses(
        "Peb",
        user_id=str(uuid4()) if user_scoped else None,
    )

    assert courses == [course]


@pytest.mark.asyncio
async def test_course_repository_promotes_course_to_master(mock_pool):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    conn.fetchrow.return_value = {"id": uuid4(), "user_id": None}
    repository._assemble = AsyncMock(return_value=course)

    promoted = await repository.promote_to_master(course.id)

    assert promoted == course


@pytest.mark.asyncio
async def test_course_repository_updates_course(mock_pool):
    pool, conn = mock_pool
    repository = CourseRepositoryDB(pool)
    course = Course(id=str(uuid4()), name="Pebble", holes=[], tees=[])
    owner_id = str(uuid4())
    conn.fetchrow.side_effect = [
        {"user_id": UUID(owner_id)},
        {"id": uuid4(), "user_id": UUID(owner_id)},
    ]
    repository._assemble = AsyncMock(return_value=course)

    updated = await repository.update_course(
        course.id,
        user_id=owner_id,
        name="New",
    )

    assert updated == course


@pytest.mark.asyncio
async def test_course_repository_returns_none_when_update_misses(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    updated = await CourseRepositoryDB(pool).update_course(
        str(uuid4()),
        user_id=str(uuid4()),
        name="New",
    )

    assert updated is None


@pytest.mark.asyncio
async def test_course_repository_upserts_hole(mock_pool):
    pool, conn = mock_pool

    await CourseRepositoryDB(pool).upsert_hole(
        str(uuid4()),
        Hole(number=1, par=4),
    )

    conn.execute.assert_awaited_once()


@pytest.mark.parametrize("existing_tee", [True, False])
@pytest.mark.asyncio
async def test_course_repository_upserts_tee(mock_pool, existing_tee):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = (
        [{"id": uuid4()}] if existing_tee else [None, {"id": uuid4()}]
    )

    await CourseRepositoryDB(pool).upsert_tee(
        str(uuid4()),
        Tee(color="Blue", hole_yardages={1: 400}),
    )

    conn.executemany.assert_awaited_once()


@pytest.mark.parametrize(("delete_result", "expected"), [("DELETE 1", True), ("DELETE 0", False)])
@pytest.mark.asyncio
async def test_course_repository_delete_reports_whether_course_existed(
    mock_pool,
    delete_result,
    expected,
):
    pool, conn = mock_pool
    conn.execute.return_value = delete_result

    deleted = await CourseRepositoryDB(pool).delete_course(
        str(uuid4()),
        user_id=str(uuid4()),
    )

    assert deleted is expected


@pytest.mark.asyncio
async def test_round_repository_rejects_invalid_owner_id(mock_pool):
    pool, _ = mock_pool

    owner_id = await RoundRepositoryDB(pool, AsyncMock()).get_round_owner_id("invalid")

    assert owner_id is None


@pytest.mark.asyncio
async def test_round_repository_reads_owner_id(mock_pool):
    pool, conn = mock_pool
    owner_id = uuid4()
    conn.fetchrow.return_value = {"user_id": owner_id}

    found = await RoundRepositoryDB(pool, AsyncMock()).get_round_owner_id(str(uuid4()))

    assert found == str(owner_id)


@pytest.mark.asyncio
async def test_round_repository_lists_played_courses(mock_pool):
    pool, conn = mock_pool
    course_id = uuid4()
    conn.fetch.return_value = [{"id": course_id, "name": "Pebble", "location": "CA"}]

    courses = await RoundRepositoryDB(pool, AsyncMock()).get_played_courses_for_user(
        str(uuid4())
    )

    assert courses == [{"id": str(course_id), "name": "Pebble", "location": "CA"}]


@pytest.mark.parametrize(
    ("row", "tee_id", "expected"),
    [({"color": "Blue"}, uuid4(), "Blue"), (None, None, None)],
)
@pytest.mark.asyncio
async def test_round_repository_resolves_tee_color(mock_pool, row, tee_id, expected):
    pool, conn = mock_pool
    conn.fetchrow.return_value = row

    color = await RoundRepositoryDB(pool, AsyncMock())._resolve_tee_color(conn, tee_id)

    assert color == expected


@pytest.mark.parametrize(
    ("row", "expected_present"),
    [({"id": uuid4()}, True), (None, False)],
)
@pytest.mark.asyncio
async def test_round_repository_resolves_tee_id(mock_pool, row, expected_present):
    pool, conn = mock_pool
    conn.fetchrow.return_value = row

    tee_id = await RoundRepositoryDB(pool, AsyncMock())._resolve_tee_id(
        conn,
        uuid4(),
        "Blue",
    )

    assert (tee_id is not None) is expected_present


@pytest.mark.asyncio
async def test_round_repository_loads_hole_id_map(mock_pool):
    pool, conn = mock_pool
    hole_id = uuid4()
    conn.fetch.return_value = [{"id": hole_id, "hole_number": 1}]

    hole_map = await RoundRepositoryDB(pool, AsyncMock())._load_hole_id_map(conn, uuid4())

    assert hole_map == {1: hole_id}


@pytest.mark.asyncio
async def test_round_repository_updates_round(mock_pool):
    pool, conn = mock_pool
    round_id = str(uuid4())
    repository = RoundRepositoryDB(pool, AsyncMock())
    repository._assemble_round = AsyncMock(return_value=SimpleNamespace(id=round_id))
    conn.fetchrow.side_effect = [{"course_id": uuid4()}, {"id": uuid4()}, {"id": uuid4()}]

    updated = await repository.update_round(
        round_id,
        user_id=str(uuid4()),
        tee_box_played="Blue",
        notes="ok",
    )

    assert updated.id == round_id


@pytest.mark.asyncio
async def test_round_repository_returns_none_when_update_misses(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    updated = await RoundRepositoryDB(pool, AsyncMock()).update_round(
        str(uuid4()),
        notes="ok",
    )

    assert updated is None


@pytest.mark.asyncio
async def test_round_repository_upsert_score_rejects_missing_round(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await RoundRepositoryDB(pool, AsyncMock()).upsert_hole_score(
            str(uuid4()),
            HoleScore(hole_number=1, strokes=4),
        )


@pytest.mark.asyncio
async def test_round_repository_upserts_score_without_course(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"course_id": None}

    await RoundRepositoryDB(pool, AsyncMock()).upsert_hole_score(
        str(uuid4()),
        HoleScore(hole_number=1, strokes=4, par_played=4),
    )

    conn.fetchrow.assert_awaited()


@pytest.mark.parametrize(("delete_result", "expected"), [("DELETE 1", True), ("DELETE 0", False)])
@pytest.mark.asyncio
async def test_round_repository_delete_reports_whether_round_existed(
    mock_pool,
    delete_result,
    expected,
):
    pool, conn = mock_pool
    conn.execute.return_value = delete_result

    deleted = await RoundRepositoryDB(pool, AsyncMock()).delete_round(
        str(uuid4()),
        user_id=str(uuid4()),
    )

    assert deleted is expected


@pytest.mark.asyncio
async def test_round_repository_saves_scan(mock_pool):
    pool, conn = mock_pool
    scan_id = uuid4()
    conn.fetchrow.return_value = {"id": scan_id}

    saved_id = await RoundRepositoryDB(pool, AsyncMock()).save_scan(
        image_path="card.png",
        llm_model="model",
        llm_raw_json={"ok": True},
    )

    assert saved_id == str(scan_id)


@pytest.mark.asyncio
async def test_round_repository_lists_scans(mock_pool):
    pool, conn = mock_pool
    scan = {"id": uuid4()}
    conn.fetch.return_value = [scan]

    scans = await RoundRepositoryDB(pool, AsyncMock()).get_scans_for_round(str(uuid4()))

    assert scans == [scan]
