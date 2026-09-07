from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

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


@pytest.mark.asyncio
async def test_user_repository_reads_auth_and_updates(mock_pool):
    pool, conn = mock_pool
    user_repository = UserRepositoryDB(pool)
    user_id = str(uuid4())
    home_id = str(uuid4())

    conn.fetchrow.return_value = _make_user_row()
    assert (await user_repository.get_user(user_id)).name == "Ada"
    assert (await user_repository.get_user_by_email(" ADA@EXAMPLE.COM ")).email == "ada@example.com"
    conn.fetchrow.return_value = {"password_hash": "hash"}
    assert await user_repository.get_password_hash(" ADA@EXAMPLE.COM ") == "hash"
    conn.fetchrow.return_value = None
    assert await user_repository.get_password_hash("missing@example.com") is None

    auth_row = {
        "id": uuid4(),
        "name": "Ada",
        "email": "ada@example.com",
        "password_hash": "hash",
        "email_verified": True,
    }
    conn.fetchrow.return_value = auth_row
    assert (await user_repository.get_auth_user_by_email("ADA@example.com"))["email_verified"] is True

    conn.fetchrow.return_value = _make_user_row(home_course_id=uuid4())
    updated_user = await user_repository.update_user(
        user_id,
        name="Grace",
        handicap_index=7.1,
        home_course_id=home_id,
        ignored="value",
    )
    assert updated_user.name == "Ada"
    update_query, *query_values = conn.fetchrow.await_args.args
    assert "last_handicap_update = NOW()" in update_query
    assert query_values == [UUID(user_id), "Grace", 7.1, UUID(home_id)]

    user_repository.get_user = AsyncMock(return_value=User(id=user_id, name="Ada", email="ada@example.com"))
    assert (await user_repository.update_user(user_id, ignored=True)).id == user_id


@pytest.mark.asyncio
async def test_user_repository_tokens_mutations_and_delete(mock_pool):
    pool, conn = mock_pool
    user_repository = UserRepositoryDB(pool)
    user_id = str(uuid4())

    conn.execute.return_value = "UPDATE 1"
    await user_repository.update_handicap(user_id, 4.2)
    await user_repository.set_password_hash(user_id, "new-hash")
    await user_repository.mark_email_verified(user_id)

    expires_at = datetime.now(timezone.utc)
    await user_repository.create_auth_token(user_id, "email_verify", "token-hash", expires_at)
    assert conn.execute.await_count == 5

    token_user_id = uuid4()
    conn.fetchrow.return_value = {"user_id": token_user_id}
    assert await user_repository.consume_auth_token("email_verify", "token-hash") == str(token_user_id)
    conn.fetchrow.return_value = None
    assert await user_repository.consume_auth_token("email_verify", "missing") is None

    conn.fetchrow.return_value = {"id": uuid4()}
    assert await user_repository.has_recent_auth_token(user_id, "email_verify", expires_at) is True
    conn.fetchrow.return_value = None
    assert await user_repository.has_recent_auth_token(user_id, "email_verify", expires_at) is False

    conn.execute.return_value = "DELETE 1"
    assert await user_repository.delete_user(user_id) is True
    conn.execute.return_value = "DELETE 0"
    assert await user_repository.delete_user(user_id) is False

    conn.execute.return_value = "UPDATE 0"
    with pytest.raises(NotFoundError):
        await user_repository.update_handicap(user_id, 4.2)
    with pytest.raises(NotFoundError):
        await user_repository.set_password_hash(user_id, "hash")
    with pytest.raises(NotFoundError):
        await user_repository.mark_email_verified(user_id)


@pytest.mark.asyncio
async def test_friendship_repository_lifecycle_and_permissions(mock_pool):
    pool, conn = mock_pool
    friendship_repository = FriendshipRepositoryDB(pool)
    requester, addressee, friendship_id = uuid4(), uuid4(), uuid4()

    with pytest.raises(ValueError, match="yourself"):
        await friendship_repository.send_request(str(requester), str(requester))

    pending_friendship = {"id": friendship_id, "requester_id": requester, "addressee_id": addressee, "status": "pending"}
    conn.fetchrow.side_effect = [None, pending_friendship]
    assert (await friendship_repository.send_request(str(requester), str(addressee)))["status"] == "pending"

    conn.fetchrow.side_effect = [pending_friendship, pending_friendship]
    assert (await friendship_repository.send_request(str(requester), str(addressee)))["id"] == friendship_id
    for status in ("accepted", "blocked"):
        conn.fetchrow.side_effect = [{**pending_friendship, "status": status}]
        with pytest.raises(DuplicateError):
            await friendship_repository.send_request(str(requester), str(addressee))

    with pytest.raises(ValueError, match="Invalid status"):
        await friendship_repository.update_status(str(friendship_id), str(addressee), "unknown")
    conn.fetchrow.side_effect = [None]
    assert await friendship_repository.update_status(str(friendship_id), str(addressee), "accepted") is None
    conn.fetchrow.side_effect = [pending_friendship, {**pending_friendship, "status": "accepted"}]
    assert (await friendship_repository.update_status(str(friendship_id), str(addressee), "accepted"))["status"] == "accepted"
    conn.fetchrow.side_effect = [pending_friendship]
    assert await friendship_repository.update_status(str(friendship_id), str(requester), "declined") is None
    conn.fetchrow.side_effect = [pending_friendship]
    assert await friendship_repository.update_status(str(friendship_id), str(uuid4()), "blocked") is None

    conn.fetch.return_value = [pending_friendship]
    assert await friendship_repository.list_for_user(
        str(requester), status="pending"
    ) == [pending_friendship]
    assert await friendship_repository.list_for_user(str(requester)) == [pending_friendship]
    assert await friendship_repository.are_friends(str(requester), str(requester)) is True
    conn.fetchrow.side_effect = None
    conn.fetchrow.return_value = {"exists": 1}
    assert await friendship_repository.are_friends(str(requester), str(addressee)) is True


@pytest.mark.asyncio
async def test_user_tee_repository_all_paths(mock_pool):
    pool, conn = mock_pool
    user_tee_repository = UserTeeRepositoryDB(pool)
    user_id, course_id, tee_id = str(uuid4()), str(uuid4()), str(uuid4())
    user_tee_row = _make_user_tee_row(id=uuid4(), user_id=uuid4(), course_id=uuid4())

    conn.fetch.return_value = [user_tee_row]
    assert len(await user_tee_repository.get_user_tees(user_id)) == 1
    assert len(await user_tee_repository.get_user_tees(user_id, course_id=course_id)) == 1
    conn.fetchrow.return_value = user_tee_row
    assert (await user_tee_repository.get_user_tee(tee_id, user_id=user_id)).name == "Blue"

    conn.fetchrow.return_value = user_tee_row
    user_tee = UserTee(user_id=user_id, name="Blue", hole_yardages={1: 400})
    assert (await user_tee_repository.update_user_tee(tee_id, user_id=user_id, name="Gold", hole_yardages={1: 390})).name == "Blue"

    user_tee_repository.get_user_tee = AsyncMock(return_value=user_tee)
    assert await user_tee_repository.update_user_tee(tee_id, ignored=True) == user_tee
    conn.fetchrow.return_value = None
    with pytest.raises(NotFoundError):
        await user_tee_repository.update_user_tee(tee_id, name="Gold")

    conn.execute.return_value = "DELETE 1"
    assert await user_tee_repository.delete_user_tee(tee_id, user_id=user_id) is True


@pytest.mark.asyncio
async def test_course_repository_queries_and_mutations(mock_pool):
    pool, conn = mock_pool
    course_repository = CourseRepositoryDB(pool)
    course_id, user_id = str(uuid4()), str(uuid4())
    course = Course(id=course_id, name="Pebble", holes=[], tees=[])
    course_row = {"id": uuid4(), "user_id": user_id}
    course_repository._assemble = AsyncMock(return_value=course)

    assert _tee_yardage_similarity({}, {1: 400}) == (0.0, 0)
    assert _tee_yardage_similarity({1: 400}, {2: 400}) == (0.0, 0)
    assert _tee_yardage_similarity({1: 400}, {1: 420}) == (1.0, 1)

    conn.fetchrow.return_value = course_row
    for location, owner in (("CA", user_id), ("CA", None), (None, user_id), (None, None)):
        assert await course_repository.find_course_by_name("Pebble", location, owner) == course

    conn.fetchrow.side_effect = [None, None, course_row]
    assert await course_repository.find_course_by_name("Pebble") == course
    conn.fetchrow.side_effect = None
    conn.fetchrow.return_value = None
    assert await course_repository.find_course_by_name("Missing") is None

    conn.fetch.return_value = [course_row]
    assert await course_repository.list_courses(user_id=user_id) == [course]
    assert await course_repository.list_courses() == [course]
    assert await course_repository.search_courses("Peb", user_id=user_id) == [course]
    assert await course_repository.search_courses("Peb") == [course]

    conn.fetchrow.return_value = course_row
    assert await course_repository.promote_to_master(course_id) == course
    assert await course_repository.update_course(course_id, user_id=user_id, name="New") == course
    conn.fetchrow.side_effect = [None]
    assert await course_repository.update_course(course_id, user_id=user_id, name="New") is None
    conn.fetchrow.side_effect = None
    conn.fetchrow.return_value = course_row
    await course_repository.upsert_hole(course_id, Hole(number=1, par=4))
    await course_repository.upsert_tee(course_id, Tee(color="Blue", hole_yardages={1: 400}))
    conn.fetchrow.side_effect = [None, {"id": uuid4()}]
    await course_repository.upsert_tee(course_id, Tee(color="Gold"))
    conn.fetchrow.side_effect = None

    conn.execute.return_value = "DELETE 1"
    assert await course_repository.delete_course(course_id, user_id=user_id) is True
    conn.execute.return_value = "DELETE 0"
    assert await course_repository.delete_course(course_id) is False


@pytest.mark.asyncio
async def test_round_repository_helpers_updates_and_scans(mock_pool):
    pool, conn = mock_pool
    round_repository = RoundRepositoryDB(pool, AsyncMock())
    round_id, user_id, course_id, tee_id = map(str, (uuid4(), uuid4(), uuid4(), uuid4()))

    assert await round_repository.get_round_owner_id("invalid") is None
    round_owner_id = uuid4()
    conn.fetchrow.return_value = {"user_id": round_owner_id}
    assert await round_repository.get_round_owner_id(round_id) == str(round_owner_id)
    played_course_id = uuid4()
    conn.fetch.return_value = [{"id": played_course_id, "name": "Pebble", "location": "CA"}]
    assert await round_repository.get_played_courses_for_user(user_id) == [
        {"id": str(played_course_id), "name": "Pebble", "location": "CA"}
    ]

    conn.fetchrow.return_value = {"color": "Blue"}
    assert await round_repository._resolve_tee_color(conn, uuid4()) == "Blue"
    assert await round_repository._resolve_tee_color(conn, None) is None
    resolved_tee_id = uuid4()
    conn.fetchrow.return_value = {"id": resolved_tee_id}
    assert await round_repository._resolve_tee_id(conn, uuid4(), "Blue") == resolved_tee_id
    conn.fetchrow.return_value = None
    assert await round_repository._resolve_tee_id(conn, uuid4(), "Missing") is None
    hole_id = uuid4()
    conn.fetch.return_value = [{"id": hole_id, "hole_number": 1}]
    assert await round_repository._load_hole_id_map(conn, uuid4()) == {1: hole_id}

    round_repository._assemble_round = AsyncMock(return_value=SimpleNamespace(id=round_id))
    conn.fetchrow.side_effect = [{"course_id": uuid4()}, {"id": uuid4()}, {"id": uuid4()}]
    updated_round = await round_repository.update_round(round_id, user_id=user_id, tee_box_played="Blue", notes="ok")
    assert updated_round.id == round_id
    conn.fetchrow.side_effect = None

    conn.fetchrow.return_value = None
    assert await round_repository.update_round(round_id, notes="ok") is None
    with pytest.raises(NotFoundError):
        await round_repository.upsert_hole_score(round_id, HoleScore(hole_number=1, strokes=4))

    conn.fetchrow.return_value = {"course_id": None}
    await round_repository.upsert_hole_score(round_id, HoleScore(hole_number=1, strokes=4, par_played=4))
    conn.execute.return_value = "DELETE 1"
    assert await round_repository.delete_round(round_id, user_id=user_id) is True
    conn.execute.return_value = "DELETE 0"
    assert await round_repository.delete_round(round_id) is False

    scan_id = uuid4()
    conn.fetchrow.return_value = {"id": scan_id}
    assert await round_repository.save_scan(image_path="card.png", llm_model="model", llm_raw_json={"ok": True}) == str(scan_id)
    conn.fetch.return_value = [{"id": scan_id}]
    assert await round_repository.get_scans_for_round(round_id) == [{"id": scan_id}]
