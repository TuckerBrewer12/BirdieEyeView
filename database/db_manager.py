"""Unified database interface composing all repositories."""

import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from models import Course, Round, User
from database.repositories.course_repo import CourseRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from database.repositories.friendship_repo import FriendshipRepositoryDB


class DatabaseManager:
    """Facade over the five domain repositories.

    Usage:
        pool = await asyncpg.create_pool(dsn=...)
        db = DatabaseManager(pool)

        # Direct access via sub-repos
        course = await db.courses.get_course("...")
        user = await db.users.get_user_by_email("...")

        # Or convenience delegates
        course = await db.get_course("...")
    """

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool
        self.courses = CourseRepositoryDB(pool)
        self.users = UserRepositoryDB(pool)
        self.rounds = RoundRepositoryDB(pool, self.courses)
        self.user_tees = UserTeeRepositoryDB(pool)
        self.friendships = FriendshipRepositoryDB(pool)

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator:
        """One connection and transaction for a multi-repository write.

        Pass the yielded connection as ``connection=`` to repository write methods.
        """
        async with self._pool.acquire() as conn, conn.transaction():
            yield conn

    # ================================================================
    # Course delegates
    # ================================================================

    async def get_course(self, course_id: str) -> Optional[Course]:
        return await self.courses.get_course(course_id)

    async def find_course_by_name(self, name: str, location: Optional[str] = None) -> Optional[Course]:
        return await self.courses.find_course_by_name(name, location)

    async def create_course(self, course: Course) -> Course:
        return await self.courses.create_course(course)

    # ================================================================
    # User delegates
    # ================================================================

    async def get_user(self, user_id: str) -> Optional[User]:
        return await self.users.get_user(user_id)

    async def create_user(self, user: User) -> User:
        return await self.users.create_user(user)

    # ================================================================
    # Round delegates
    # ================================================================

    async def get_round(self, round_id: str) -> Optional[Round]:
        return await self.rounds.get_round(round_id)

    async def create_round(self, round_: Round, user_id: str, **kwargs) -> Round:
        return await self.rounds.create_round(round_, user_id, **kwargs)

    async def save_scan(self, **kwargs) -> str:
        return await self.rounds.save_scan(**kwargs)
