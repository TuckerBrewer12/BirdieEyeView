"""Forward upgrades from the frozen pre-refactor schema; never replay old data backfills."""

from pathlib import Path

import asyncpg
import pytest

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]
ROOT = Path(__file__).resolve().parents[2]
LEGACY = Path(__file__).parent / "fixtures" / "schema_012.sql"
NEW_MIGRATIONS = sorted((ROOT / "database" / "migrations").glob("01[34]_*.sql"))


async def load_legacy(conn):
    await conn.execute("DROP SCHEMA users CASCADE; DROP SCHEMA courses CASCADE;")
    await conn.execute(LEGACY.read_text())


async def shape(conn):
    return [
        tuple(row)
        for row in await conn.fetch(
            """SELECT table_schema,table_name,column_name,data_type,udt_name,is_nullable
           FROM information_schema.columns WHERE table_schema IN ('courses','users')
           ORDER BY table_schema,table_name,column_name""",
        )
    ]


async def constraints(conn):
    return [
        tuple(row)
        for row in await conn.fetch(
            """SELECT n.nspname,c.relname,pg_get_constraintdef(k.oid)
           FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
           JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname IN ('courses','users') ORDER BY 1,2,3""",
        )
    ]


async def indexes(conn):
    return [
        tuple(row)
        for row in await conn.fetch(
            """SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
               WHERE schemaname IN ('courses','users') ORDER BY 1,2,3""",
        )
    ]


async def test_new_upgrade_matches_fresh_schema_without_guessing_legacy_context(postgres_pool):
    async with postgres_pool.acquire() as conn:
        fresh_shape, fresh_constraints = await shape(conn), await constraints(conn)
        fresh_indexes = await indexes(conn)
        await load_legacy(conn)
        user_id = await conn.fetchval(
            "INSERT INTO users.users(name,email,friend_code,scoring_goal) VALUES('Legacy','legacy@example.test','GCLEGACY',89) RETURNING id",
        )
        course_id = await conn.fetchval(
            "INSERT INTO courses.courses(name,total_holes,par) VALUES('Legacy Course',18,72) RETURNING id",
        )
        round_id = await conn.fetchval(
            "INSERT INTO users.rounds(user_id,course_id,total_score,holes_played) VALUES($1,$2,36,9) RETURNING id",
            user_id,
            course_id,
        )
        for path in NEW_MIGRATIONS:
            await conn.execute(path.read_text())
        assert await shape(conn) == fresh_shape
        assert await constraints(conn) == fresh_constraints
        assert await indexes(conn) == fresh_indexes
        assert await conn.fetchval("SELECT intended_holes FROM users.rounds WHERE id=$1", round_id) is None
        assert await conn.fetchval("SELECT scoring_goal FROM users.users WHERE id=$1", user_id) == 89
        assert await conn.fetchval("SELECT scoring_goal_nine FROM users.users WHERE id=$1", user_id) is None


async def test_domain_preflight_rolls_back_schema_changes_and_preserves_bad_row(postgres_pool):
    async with postgres_pool.acquire() as conn:
        await load_legacy(conn)
        user_id = await conn.fetchval(
            "INSERT INTO users.users(name,email,friend_code,scoring_goal) VALUES('Legacy','badgoal@example.test','GCBADGOAL',0) RETURNING id",
        )
        previous = await shape(conn)
        with pytest.raises(asyncpg.RaiseError, match="out-of-range goals"):
            await conn.execute(NEW_MIGRATIONS[0].read_text())
        await conn.execute("ROLLBACK")
        assert await shape(conn) == previous
        assert await conn.fetchval("SELECT scoring_goal FROM users.users WHERE id=$1", user_id) == 0


@pytest.mark.parametrize("duplicate_kind", ["tee", "provider", "email"])
async def test_identity_preflight_reports_conflicts_without_deleting_data(postgres_pool, duplicate_kind):
    async with postgres_pool.acquire() as conn:
        await load_legacy(conn)
        user_id = await conn.fetchval(
            "INSERT INTO users.users(name,email,friend_code) VALUES('Legacy','identity@example.test','GCIDENTITY') RETURNING id",
        )
        if duplicate_kind == "tee":
            await conn.execute("INSERT INTO users.user_tees(user_id,name) VALUES($1,'Blue'),($1,'blue')", user_id)
        elif duplicate_kind == "provider":
            await conn.execute(
                "INSERT INTO courses.courses(name,external_course_id) VALUES('A','same-id'),('B','same-id')"
            )
        else:
            await conn.execute(
                "INSERT INTO users.users(name,email,friend_code) VALUES('Other','IDENTITY@EXAMPLE.TEST','GCOTHER')"
            )
        await conn.execute(NEW_MIGRATIONS[0].read_text())
        previous = await shape(conn)
        with pytest.raises(asyncpg.RaiseError):
            await conn.execute(NEW_MIGRATIONS[1].read_text())
        await conn.execute("ROLLBACK")
        assert await shape(conn) == previous
        table = {"tee": "users.user_tees", "provider": "courses.courses", "email": "users.users"}[duplicate_kind]
        assert await conn.fetchval(f"SELECT COUNT(*) FROM {table}") == 2
