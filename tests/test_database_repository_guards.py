"""Unit coverage for repository guard rails: reference checks, layout checks and error translation.

SQL behavior itself is covered by tests/integration; these tests pin the Python-side branching.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import asyncpg
import pytest

from database.exceptions import ConflictError, DuplicateError, IntegrityError, NotFoundError
from database.repositories.course_repo import CourseRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from models import Course, Hole, Tee, User, UserTee
from tests.helpers import make_course, make_round


# ================================================================
# Round references and relinking
# ================================================================


def _master_course_row(course_id):
    return {"id": course_id, "user_id": None, "total_holes": 18}


@pytest.mark.asyncio
async def test_round_reference_check_rejects_another_users_course(mock_pool):
    _, conn = mock_pool
    course_id = uuid4()
    conn.fetchrow.return_value = {"id": course_id, "user_id": uuid4(), "total_holes": 18}

    with pytest.raises(IntegrityError, match="course is missing or inaccessible"):
        await RoundRepositoryDB(AsyncMock(), AsyncMock())._validate_references(conn, uuid4(), course_id, None, None)


@pytest.mark.asyncio
async def test_round_reference_check_rejects_tee_from_another_course(mock_pool):
    _, conn = mock_pool
    course_id = uuid4()
    conn.fetchrow.side_effect = [_master_course_row(course_id), {"course_id": uuid4()}]

    with pytest.raises(IntegrityError, match="does not belong to the round course"):
        await RoundRepositoryDB(AsyncMock(), AsyncMock())._validate_references(conn, uuid4(), course_id, uuid4(), None)


@pytest.mark.asyncio
async def test_round_reference_check_rejects_another_users_custom_tee(mock_pool):
    _, conn = mock_pool
    course_id = uuid4()
    conn.fetchrow.side_effect = [_master_course_row(course_id), {"user_id": uuid4(), "course_id": None}]

    with pytest.raises(IntegrityError, match="Custom tee"):
        await RoundRepositoryDB(AsyncMock(), AsyncMock())._validate_references(conn, uuid4(), course_id, None, uuid4())


@pytest.mark.asyncio
async def test_link_course_backfills_missing_snapshots_and_resolves_tee(mock_pool):
    pool, conn = mock_pool
    round_id, owner_id, course_id, tee_id = uuid4(), uuid4(), uuid4(), uuid4()
    course = Course(
        id=str(course_id),
        name="Linked",
        total_holes=18,
        holes=[Hole(number=n, par=4, handicap=n) for n in range(1, 19)],
        tees=[Tee(color="Blue")],
    )

    async def fetchrow(sql, *args):
        if "FROM users.rounds" in sql:
            return {"id": round_id, "user_id": owner_id, "user_tee_id": None, "course_id": None}
        if "FROM courses.courses" in sql:
            return _master_course_row(course_id)
        if "FROM courses.tees WHERE id" in sql:
            return {"course_id": course_id}
        return {"id": tee_id}  # tee lookup by course and color

    conn.fetchrow.side_effect = fetchrow
    conn.fetch.return_value = [{"hole_number": 1, "id": uuid4()}, {"hole_number": 2, "id": uuid4()}]
    course_repo = AsyncMock()
    course_repo.get_course.return_value = course
    repository = RoundRepositoryDB(pool, course_repo)
    repository._assemble_round = AsyncMock(return_value=make_round(round_id))

    linked = await repository.link_course_to_round(str(round_id), str(course_id), user_id=str(owner_id))

    assert linked.course.id == str(course_id)
    assert [(s.par_played, s.handicap_played) for s in linked.hole_scores] == [(4, 1), (4, 2)]
    relink = next(c.args for c in conn.execute.await_args_list if "UPDATE users.rounds SET course_id" in c.args[0])
    assert relink[1:] == (round_id, course_id, tee_id, None)
    assert sum("UPDATE users.hole_scores" in c.args[0] for c in conn.execute.await_args_list) == 2


@pytest.mark.asyncio
async def test_link_course_returns_none_for_missing_round(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    assert await RoundRepositoryDB(pool, AsyncMock()).link_course_to_round(str(uuid4()), str(uuid4())) is None


# ================================================================
# Course layout checks and error translation
# ================================================================


@pytest.mark.asyncio
async def test_fill_course_gaps_rejects_holes_outside_nine_hole_layout(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"id": uuid4(), "total_holes": 9}

    with pytest.raises(IntegrityError, match="outside the declared course layout"):
        await CourseRepositoryDB(pool).fill_course_gaps(str(uuid4()), [{"hole_number": 12, "par": 4}])
    conn.execute.assert_not_awaited()


@pytest.mark.asyncio
async def test_fill_course_gaps_requires_existing_course(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await CourseRepositoryDB(pool).fill_course_gaps(str(uuid4()), [Hole(number=1, par=4)])


@pytest.mark.asyncio
async def test_fill_course_gaps_accepts_hole_models_and_fills_missing_yardages(mock_pool):
    pool, conn = mock_pool
    course_id, tee_id = uuid4(), uuid4()
    conn.fetchrow.side_effect = [
        {"id": course_id, "total_holes": 18},
        {"id": tee_id, "slope_rating": None, "course_rating": None},
    ]

    await CourseRepositoryDB(pool).fill_course_gaps(
        str(course_id), [Hole(number=3, par=5)], "Blue", yardages={"3": 510, "4": None}
    )

    statements = [c.args for c in conn.execute.await_args_list]
    assert any("INSERT INTO courses.holes" in s[0] and s[1:] == (course_id, 3, 5, None) for s in statements)
    assert any("SET par=NULL" in s[0] for s in statements)
    assert [s[1:] for s in statements if "INSERT INTO courses.tee_yardages" in s[0]] == [(tee_id, 3, 510)]


@pytest.mark.asyncio
async def test_update_course_without_fields_hides_courses_the_user_does_not_own(mock_pool):
    pool, _ = mock_pool
    repository = CourseRepositoryDB(pool)
    repository.get_course = AsyncMock(return_value=make_course(uuid4()))

    assert await repository.update_course(str(uuid4()), user_id=str(uuid4())) is None


@pytest.mark.asyncio
async def test_update_course_rejects_nine_hole_layout_with_back_nine_holes(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"id": uuid4()}
    conn.fetchval.return_value = True

    with pytest.raises(IntegrityError, match="outside the requested course layout"):
        await CourseRepositoryDB(pool).update_course(str(uuid4()), total_holes=9)


@pytest.mark.asyncio
async def test_update_course_translates_identity_conflicts(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = [{"id": uuid4()}, asyncpg.UniqueViolationError("duplicate")]

    with pytest.raises(DuplicateError):
        await CourseRepositoryDB(pool).update_course(str(uuid4()), user_id=str(uuid4()), name="Taken")


@pytest.mark.asyncio
async def test_upsert_hole_requires_existing_course(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await CourseRepositoryDB(pool).upsert_hole(str(uuid4()), Hole(number=1, par=4))


@pytest.mark.asyncio
async def test_upsert_hole_rejects_hole_outside_nine_hole_layout(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"total_holes": 9}

    with pytest.raises(IntegrityError, match="outside the declared course layout"):
        await CourseRepositoryDB(pool).upsert_hole(str(uuid4()), Hole(number=10, par=4))


@pytest.mark.asyncio
async def test_delete_course_referenced_by_rounds_is_a_conflict(mock_pool):
    pool, conn = mock_pool
    conn.execute.side_effect = asyncpg.ForeignKeyViolationError("referenced")

    with pytest.raises(ConflictError):
        await CourseRepositoryDB(pool).delete_course(str(uuid4()), user_id=str(uuid4()))


@pytest.mark.asyncio
async def test_clone_course_hides_another_users_private_course(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = {"id": uuid4(), "user_id": uuid4()}

    with pytest.raises(NotFoundError):
        await CourseRepositoryDB(pool).clone_course(str(uuid4()), str(uuid4()))


@pytest.mark.asyncio
async def test_create_course_rejects_case_insensitive_duplicate_tees(mock_pool):
    pool, _ = mock_pool
    course = Course(name="Dupes", tees=[Tee(color="Blue"), Tee(color="blue")])

    with pytest.raises(DuplicateError, match="unique case-insensitively"):
        await CourseRepositoryDB(pool).create_course(course)


# ================================================================
# User tees and users
# ================================================================


@pytest.mark.asyncio
async def test_delete_user_tee_used_by_rounds_is_a_conflict(mock_pool):
    pool, conn = mock_pool
    conn.execute.side_effect = asyncpg.ForeignKeyViolationError("referenced")

    with pytest.raises(ConflictError, match="used by past rounds"):
        await UserTeeRepositoryDB(pool).delete_user_tee(str(uuid4()), user_id=str(uuid4()))


@pytest.mark.asyncio
async def test_create_user_tee_rejects_inaccessible_course(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None
    tee = UserTee(user_id=str(uuid4()), course_id=str(uuid4()), name="Blue")

    with pytest.raises(IntegrityError, match="missing or inaccessible"):
        await UserTeeRepositoryDB(pool).create_user_tee(tee)


@pytest.mark.asyncio
async def test_update_user_tee_requires_owned_tee(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.return_value = None

    with pytest.raises(NotFoundError):
        await UserTeeRepositoryDB(pool).update_user_tee(str(uuid4()), user_id=str(uuid4()), name="White")


@pytest.mark.asyncio
async def test_update_user_tee_translates_duplicate_names(mock_pool):
    pool, conn = mock_pool
    tee_id = uuid4()
    conn.fetchrow.return_value = {
        "id": tee_id,
        "user_id": uuid4(),
        "course_id": None,
        "name": "Blue",
        "slope_rating": None,
        "course_rating": None,
        "hole_yardages": {},
        "created_at": None,
    }
    conn.fetch.return_value = []
    conn.execute.side_effect = asyncpg.UniqueViolationError("duplicate")

    with pytest.raises(DuplicateError, match="already exists"):
        await UserTeeRepositoryDB(pool).update_user_tee(str(tee_id), name="White")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "expected"),
    [(asyncpg.UniqueViolationError("other key"), DuplicateError), (asyncpg.CheckViolationError("bad"), IntegrityError)],
)
async def test_create_user_translates_constraint_failures(mock_pool, error, expected):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = error

    with pytest.raises(expected):
        await UserRepositoryDB(pool).create_user(User(name="Ada", email="ada@example.com"))


@pytest.mark.asyncio
async def test_update_user_translates_invalid_values(mock_pool):
    pool, conn = mock_pool
    conn.fetchrow.side_effect = asyncpg.CheckViolationError("bad goal")

    with pytest.raises(IntegrityError):
        await UserRepositoryDB(pool).update_user(str(uuid4()), scoring_goal_nine=40)
