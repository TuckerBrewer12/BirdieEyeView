import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncIterator

from database.repositories.course_repo import CourseRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from database.repositories.friendship_repo import FriendshipRepositoryDB


class DatabaseManager:
    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self.courses = CourseRepositoryDB(pool)
        self.users = UserRepositoryDB(pool)
        self.rounds = RoundRepositoryDB(pool, self.courses)
        self.user_tees = UserTeeRepositoryDB(pool)
        self.friendships = FriendshipRepositoryDB(pool)

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator:
        async with self._pool.acquire() as conn, conn.transaction():
            yield conn
