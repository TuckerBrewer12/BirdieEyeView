import os
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import asyncpg
import pytest
import pytest_asyncio

from database import DatabaseManager


SCHEMA_PATH = Path(__file__).resolve().parents[2] / "database" / "schema.sql"
TEST_DATABASE_NAME_PATTERN = re.compile(r"(?:^test(?:_|$)|_test$)", re.IGNORECASE)


def _get_test_database_url() -> str:
    database_url = os.environ.get("TEST_DATABASE_URL")
    if not database_url:
        pytest.fail(
            "PostgreSQL integration tests require TEST_DATABASE_URL; "
            "DATABASE_URL is intentionally ignored.",
            pytrace=False,
        )

    parsed = urlparse(database_url)
    database_name = unquote(parsed.path.lstrip("/")).split("/", 1)[0]
    if parsed.scheme not in {"postgres", "postgresql"} or not database_name:
        pytest.fail("TEST_DATABASE_URL must be a valid PostgreSQL URL.", pytrace=False)
    if not TEST_DATABASE_NAME_PATTERN.search(database_name):
        pytest.fail(
            "Refusing to reset PostgreSQL schemas because the database name is not test-only. "
            "Use a name beginning with 'test' or ending with '_test'.",
            pytrace=False,
        )
    return database_url


@pytest_asyncio.fixture
async def postgres_pool():
    pool = await asyncpg.create_pool(
        dsn=_get_test_database_url(),
        min_size=1,
        max_size=4,
        server_settings={"timezone": "UTC"},
    )
    try:
        async with pool.acquire() as connection:
            await connection.execute(
                "DROP SCHEMA IF EXISTS courses CASCADE; "
                "DROP SCHEMA IF EXISTS users CASCADE;"
            )
            await connection.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
        yield pool
    finally:
        await pool.close()


@pytest.fixture
def database_manager(postgres_pool) -> DatabaseManager:
    return DatabaseManager(postgres_pool)
