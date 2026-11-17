import asyncio
from unittest.mock import AsyncMock

import pytest

from database.connection import DatabasePool


@pytest.mark.asyncio
async def test_concurrent_initialization_and_close_share_one_pool(monkeypatch):
    pool = AsyncMock()

    async def create_pool(**kwargs):
        await asyncio.sleep(0)
        return pool

    factory = AsyncMock(side_effect=create_pool)
    monkeypatch.setattr("database.connection.asyncpg.create_pool", factory)
    database = DatabasePool()
    await asyncio.gather(database.initialize(), database.initialize())
    factory.assert_awaited_once()
    assert database.pool is pool
    await asyncio.gather(database.close(), database.close())
    pool.close.assert_awaited_once()
    assert not database.is_initialized


@pytest.mark.asyncio
async def test_failed_initialization_can_retry(monkeypatch):
    pool = AsyncMock()
    factory = AsyncMock(side_effect=[OSError("offline"), pool])
    monkeypatch.setattr("database.connection.asyncpg.create_pool", factory)
    database = DatabasePool()
    with pytest.raises(OSError):
        await database.initialize()
    assert not database.is_initialized
    await database.initialize()
    assert database.pool is pool
    await database.close()
