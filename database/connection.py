import logging

import asyncpg
from typing import Optional

logger = logging.getLogger(__name__)


class DatabasePool:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def initialize(
        self,
        dsn: Optional[str] = None,
        *,
        host: str = "localhost",
        port: int = 5432,
        database: str = "golf_scorecard",
        user: Optional[str] = None,
        password: str = "",
        min_size: int = 2,
        max_size: int = 10,
        connect_timeout: Optional[float] = None,
    ) -> None:
        if self._pool is not None:
            return
        pool_kwargs = {}
        if connect_timeout is not None:
            pool_kwargs["timeout"] = max(float(connect_timeout), 1.0)
        self._pool = await asyncpg.create_pool(
            dsn=dsn,
            host=None if dsn else host,
            port=None if dsn else port,
            database=None if dsn else database,
            user=None if dsn else user,
            password=None if dsn else password,
            min_size=min_size,
            max_size=max_size,
            **pool_kwargs,
        )

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError(
                "Database pool not initialized. Call await db.initialize() first."
            )
        return self._pool

    @property
    def is_initialized(self) -> bool:
        return self._pool is not None

    async def health_check(self) -> bool:
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception:
            logger.warning("Database health check failed", exc_info=True)
            return False


db = DatabasePool()
