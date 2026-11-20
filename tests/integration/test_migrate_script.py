import importlib.util
import sys
from pathlib import Path

import pytest

from tests.integration.test_database_migrations import constraints, indexes, load_legacy, shape

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "migrate.py"
_spec = importlib.util.spec_from_file_location("migrate", _SCRIPT)
migrate = importlib.util.module_from_spec(_spec)
sys.modules["migrate"] = migrate
_spec.loader.exec_module(migrate)


async def fresh_history(conn):
    await conn.execute("DROP TABLE IF EXISTS public.schema_migrations")


async def recorded(conn):
    return [row["version"] for row in await conn.fetch("SELECT version FROM public.schema_migrations ORDER BY 1")]


async def test_applies_pending_migrations_in_order_and_records_them(postgres_pool):
    async with postgres_pool.acquire() as conn:
        fresh = (await shape(conn), await constraints(conn), await indexes(conn))
        await load_legacy(conn)
        await fresh_history(conn)
        migrations = migrate.discover()
        await migrate.baseline(conn, 12, migrations)

        ran = await migrate.apply_pending(conn, migrations)

        assert ran == [m.name for m in migrations if m.version > 12]
        assert (await shape(conn), await constraints(conn), await indexes(conn)) == fresh
        assert await recorded(conn) == [m.version for m in migrations]
        assert await migrate.apply_pending(conn, migrations) == []


async def test_failed_migration_rolls_back_and_stays_pending(postgres_pool):
    async with postgres_pool.acquire() as conn:
        await load_legacy(conn)
        await fresh_history(conn)
        await conn.execute(
            "INSERT INTO users.users(name,email,friend_code,scoring_goal) VALUES('Bad','bad@example.test','GCBAD',0)"
        )
        migrations = migrate.discover()
        await migrate.baseline(conn, 12, migrations)
        before = await shape(conn)

        with pytest.raises(migrate.MigrationError, match=r"014_persist_domain_context\.sql failed and was rolled back"):
            await migrate.apply_pending(conn, migrations)

        assert await recorded(conn) == [m.version for m in migrations if m.version <= 13]
        assert await conn.fetchval("SELECT to_regclass('courses.tee_ratings')") is None
        assert await shape(conn) == before
        assert await conn.fetchval("SELECT scoring_goal FROM users.users WHERE email='bad@example.test'") == 0


async def test_refuses_a_database_with_tables_but_no_history(postgres_pool):
    async with postgres_pool.acquire() as conn:
        await fresh_history(conn)
        with pytest.raises(migrate.MigrationError, match="no migration history"):
            await migrate.apply_pending(conn, migrate.discover())
        assert await recorded(conn) == []
