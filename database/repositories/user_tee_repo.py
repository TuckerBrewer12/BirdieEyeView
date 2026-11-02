"""CRUD operations for user-owned tee configurations."""

import json
import asyncpg
from typing import List, Optional
from uuid import UUID

from models import UserTee
from database.converters import user_tee_from_row, user_tee_to_row, tee_ratings_to_rows
from database.exceptions import ConflictError, DuplicateError, IntegrityError, NotFoundError


class UserTeeRepositoryDB:
    """Async CRUD for users.user_tees."""

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    async def _assemble_many(self, conn, rows) -> list[UserTee]:
        if not rows:
            return []
        ratings = await conn.fetch(
            "SELECT * FROM users.user_tee_ratings WHERE tee_id = ANY($1::uuid[])",
            [row["id"] for row in rows],
        )
        by_tee = {}
        for rating in ratings:
            by_tee.setdefault(rating["tee_id"], []).append(rating)
        return [user_tee_from_row(row, by_tee.get(row["id"], [])) for row in rows]

    async def _write_ratings(self, conn, tee: UserTee) -> None:
        tee_id = UUID(tee.id)
        await conn.execute("DELETE FROM users.user_tee_ratings WHERE tee_id = $1", tee_id)
        ratings = tee_ratings_to_rows(tee, tee_id)
        if ratings:
            await conn.executemany(
                """INSERT INTO users.user_tee_ratings (tee_id,hole_numbers,course_rating,slope_rating)
                   VALUES ($1,$2,$3,$4)""",
                ratings,
            )

    async def get_user_tees(self, user_id: str, *, course_id: Optional[str] = None) -> List[UserTee]:
        """List a user's custom tees, optionally filtered by course."""
        async with self._pool.acquire() as conn:
            if course_id:
                rows = await conn.fetch(
                    """SELECT * FROM users.user_tees
                       WHERE user_id = $1 AND course_id = $2
                       ORDER BY name""",
                    UUID(user_id),
                    UUID(course_id),
                )
            else:
                rows = await conn.fetch(
                    """SELECT * FROM users.user_tees
                       WHERE user_id = $1 ORDER BY name""",
                    UUID(user_id),
                )
            return await self._assemble_many(conn, rows)

    async def get_user_tee(self, tee_id: str, *, user_id: Optional[str] = None) -> Optional[UserTee]:
        """Get a single user tee by ID."""
        async with self._pool.acquire() as conn:
            if user_id:
                row = await conn.fetchrow(
                    "SELECT * FROM users.user_tees WHERE id = $1 AND user_id = $2",
                    UUID(tee_id),
                    UUID(user_id),
                )
            else:
                row = await conn.fetchrow(
                    "SELECT * FROM users.user_tees WHERE id = $1",
                    UUID(tee_id),
                )
            return (await self._assemble_many(conn, [row]))[0] if row else None

    async def create_user_tee(self, user_tee: UserTee) -> UserTee:
        """Create a user tee configuration."""
        row_data = user_tee_to_row(user_tee)
        try:
            async with self._pool.acquire() as conn, conn.transaction():
                if row_data["course_id"] is not None:
                    course = await conn.fetchrow(
                        """SELECT id FROM courses.courses WHERE id = $1
                           AND (user_id IS NULL OR user_id = $2) FOR KEY SHARE""",
                        row_data["course_id"],
                        row_data["user_id"],
                    )
                    if not course:
                        raise IntegrityError("Linked course is missing or inaccessible")
                row = await conn.fetchrow(
                    """INSERT INTO users.user_tees
                       (user_id, course_id, name, slope_rating, course_rating, hole_yardages,
                        yardage_holes, rating_holes, total_yardage)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *""",
                    row_data["user_id"],
                    row_data["course_id"],
                    row_data["name"],
                    row_data["slope_rating"],
                    row_data["course_rating"],
                    json.dumps(row_data["hole_yardages"]),
                    row_data["yardage_holes"],
                    row_data["rating_holes"],
                    row_data["total_yardage"],
                )
                saved = user_tee.model_copy(update={"id": str(row["id"])})
                await self._write_ratings(conn, saved)
                return user_tee_from_row(row, [rating.model_dump() for rating in saved.ratings])
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(str(e)) from e
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid user tee reference or value") from error

    async def update_user_tee(self, tee_id: str, *, user_id: Optional[str] = None, **fields) -> Optional[UserTee]:
        """Update a user tee configuration."""
        allowed = {
            "name",
            "slope_rating",
            "course_rating",
            "hole_yardages",
            "yardage_holes",
            "rating_holes",
            "total_yardage",
            "ratings",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return await self.get_user_tee(tee_id, user_id=user_id)

        values = [UUID(tee_id)]
        where_clause = "id = $1"
        if user_id:
            values.append(UUID(user_id))
            where_clause += f" AND user_id = ${len(values)}"

        try:
            async with self._pool.acquire() as conn, conn.transaction():
                row = await conn.fetchrow(f"SELECT * FROM users.user_tees WHERE {where_clause} FOR UPDATE", *values)
                if not row:
                    raise NotFoundError(f"UserTee {tee_id} not found")
                tee = (await self._assemble_many(conn, [row]))[0]
                error = tee.update_fields(**updates)
                if error:
                    raise IntegrityError(error)
                data = user_tee_to_row(tee)
                await conn.execute(
                    """UPDATE users.user_tees SET name=$2, slope_rating=$3, course_rating=$4,
                           hole_yardages=$5, yardage_holes=$6, rating_holes=$7, total_yardage=$8 WHERE id=$1""",
                    row["id"],
                    data["name"],
                    data["slope_rating"],
                    data["course_rating"],
                    json.dumps(data["hole_yardages"]),
                    data["yardage_holes"],
                    data["rating_holes"],
                    data["total_yardage"],
                )
                await self._write_ratings(conn, tee)
                return tee
        except asyncpg.UniqueViolationError as error:
            raise DuplicateError("A user tee with that name already exists") from error
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid user tee value") from error

    async def delete_user_tee(self, tee_id: str, *, user_id: Optional[str] = None) -> bool:
        """Delete a user tee. Returns True if deleted."""
        try:
            async with self._pool.acquire() as conn:
                if user_id:
                    result = await conn.execute(
                        "DELETE FROM users.user_tees WHERE id = $1 AND user_id = $2",
                        UUID(tee_id),
                        UUID(user_id),
                    )
                else:
                    result = await conn.execute("DELETE FROM users.user_tees WHERE id = $1", UUID(tee_id))
                return result == "DELETE 1"
        except asyncpg.ForeignKeyViolationError as error:
            raise ConflictError("This tee is used by past rounds and cannot be deleted") from error
