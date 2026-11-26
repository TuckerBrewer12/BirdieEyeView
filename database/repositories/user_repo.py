import json
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import asyncpg

from models import User
from database.connection import write_transaction
from database.converters import user_from_row, user_to_row
from database.exceptions import DuplicateError, IntegrityError, NotFoundError


class UserRepositoryDB:
    FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    FRIEND_CODE_LEN = 8

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    def _generate_friend_code(self) -> str:
        return "GC" + "".join(secrets.choice(self.FRIEND_CODE_ALPHABET) for _ in range(self.FRIEND_CODE_LEN))

    async def get_user(self, user_id: str) -> Optional[User]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE id = $1", UUID(user_id))
            return user_from_row(row) if row else None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        normalized = self._normalize_email(email)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE LOWER(BTRIM(email)) = $1", normalized)
            return user_from_row(row) if row else None

    async def get_user_by_friend_code(self, friend_code: str) -> Optional[User]:
        normalized = friend_code.strip().upper()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE friend_code = $1", normalized)
            return user_from_row(row) if row else None

    async def get_password_hash(self, email: str) -> Optional[str]:
        normalized = self._normalize_email(email)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT password_hash FROM users.users WHERE LOWER(BTRIM(email)) = $1", normalized
            )
            return row["password_hash"] if row else None

    async def get_auth_user_by_email(self, email: str) -> Optional[dict]:
        normalized = self._normalize_email(email)
        async with self._pool.acquire() as conn:
            try:
                row = await conn.fetchrow(
                    """SELECT id, name, email, password_hash, email_verified
                       FROM users.users
                       WHERE LOWER(BTRIM(email)) = $1""",
                    normalized,
                )
            except asyncpg.UndefinedColumnError as error:
                raise IntegrityError("Authentication schema is unavailable; apply required migrations") from error
            if not row:
                return None
            return {
                "id": str(row["id"]),
                "name": row["name"],
                "email": row["email"],
                "password_hash": row["password_hash"],
                "email_verified": bool(row["email_verified"]),
            }

    async def create_user(self, user: User, *, password_hash: Optional[str] = None) -> User:
        data = user_to_row(user)
        normalized_email = self._normalize_email(data["email"])
        async with self._pool.acquire() as conn:
            for _ in range(10):
                friend_code = data["friend_code"] or self._generate_friend_code()
                try:
                    row = await conn.fetchrow(
                        """INSERT INTO users.users
                           (friend_code, name, email, handicap_index, home_course_id, password_hash,
                            email_verified, email_verified_at, last_handicap_update, scoring_goal, scoring_goal_nine)
                           VALUES ($1, $2, $3, $4, $5, $6,
                                   COALESCE($7::boolean, FALSE),
                                   CASE WHEN COALESCE($7::boolean, FALSE) THEN NOW() ELSE NULL END,
                                   CASE WHEN $4::numeric IS NULL THEN NULL ELSE NOW() END, $8, $9)
                           RETURNING *""",
                        friend_code,
                        data["name"],
                        normalized_email,
                        data["handicap_index"],
                        data["home_course_id"],
                        password_hash,
                        user.email_verified,
                        data["scoring_goal"],
                        data["scoring_goal_nine"],
                    )
                    return user_from_row(row)
                except asyncpg.UniqueViolationError as e:
                    if e.constraint_name in {
                        "users_email_key",
                        "users_users_email_key",
                        "idx_users_email",
                        "idx_users_email_normalized",
                    }:
                        raise DuplicateError(f"Email already in use: {e}") from e
                    if e.constraint_name in {
                        "users_friend_code_key",
                        "users_users_friend_code_key",
                        "idx_users_friend_code",
                    }:
                        data["friend_code"] = None
                        continue
                    raise DuplicateError("Conflicting user identity") from e
                except asyncpg.IntegrityConstraintViolationError as error:
                    raise IntegrityError("Invalid user data or course reference") from error
            raise DuplicateError("Could not allocate a unique friend code")

    async def update_user(self, user_id: str, **fields) -> Optional[User]:
        allowed = {
            "name",
            "email",
            "handicap_index",
            "home_course_id",
            "preferences",
            "scoring_goal",
            "scoring_goal_nine",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return await self.get_user(user_id)
        if "email" in updates:
            updates["email"] = self._normalize_email(updates["email"])

        if "home_course_id" in updates and updates["home_course_id"] is not None:
            updates["home_course_id"] = UUID(updates["home_course_id"])
        if "preferences" in updates and updates["preferences"] is not None:
            updates["preferences"] = json.dumps(updates["preferences"])

        set_parts = []
        values = [UUID(user_id)]
        for k, v in updates.items():
            values.append(v)
            set_parts.append(f"{k} = ${len(values)}")
        if "handicap_index" in updates:
            set_parts.append("last_handicap_update = NOW()")
        set_clause = ", ".join(set_parts)

        try:
            async with self._pool.acquire() as conn:
                row = await conn.fetchrow(
                    f"UPDATE users.users SET {set_clause} WHERE id = $1 RETURNING *",
                    *values,
                )
                return user_from_row(row) if row else None
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(f"Email already in use: {e}") from e
        except asyncpg.IntegrityConstraintViolationError as error:
            raise IntegrityError("Invalid user data or course reference") from error

    async def set_password_hash(self, user_id: str, password_hash: str, *, connection=None) -> None:
        async with write_transaction(self._pool, connection) as conn:
            result = await conn.execute(
                "UPDATE users.users SET password_hash = $2 WHERE id = $1",
                UUID(user_id),
                password_hash,
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"User {user_id} not found")

    async def mark_email_verified(self, user_id: str, *, connection=None) -> None:
        async with write_transaction(self._pool, connection) as conn:
            result = await conn.execute(
                """UPDATE users.users
                   SET email_verified = TRUE, email_verified_at = NOW()
                   WHERE id = $1""",
                UUID(user_id),
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"User {user_id} not found")

    async def create_auth_token(
        self,
        user_id: str,
        token_type: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.fetchrow("SELECT id FROM users.users WHERE id = $1 FOR UPDATE", UUID(user_id))
                await conn.execute(
                    """UPDATE users.auth_tokens
                       SET used_at = (clock_timestamp() AT TIME ZONE 'UTC')
                       WHERE user_id = $1
                         AND token_type = $2
                         AND used_at IS NULL""",
                    UUID(user_id),
                    token_type,
                )
                await conn.execute(
                    """INSERT INTO users.auth_tokens (user_id, token_type, token_hash, expires_at, created_at)
                       VALUES ($1, $2, $3, $4, clock_timestamp() AT TIME ZONE 'UTC')""",
                    UUID(user_id),
                    token_type,
                    token_hash,
                    expires_at,
                )

    async def auth_token_user(self, token_type: str, token_hash: str, *, connection=None) -> Optional[str]:
        async def lookup(conn) -> Optional[str]:
            user_id = await conn.fetchval(
                """SELECT user_id FROM users.auth_tokens
                   WHERE token_type = $1 AND token_hash = $2
                     AND used_at IS NULL AND expires_at > (clock_timestamp() AT TIME ZONE 'UTC')
                   ORDER BY created_at DESC, id DESC LIMIT 1""",
                token_type,
                token_hash,
            )
            return str(user_id) if user_id else None

        if connection is not None:
            return await lookup(connection)
        async with self._pool.acquire() as conn:
            return await lookup(conn)

    async def consume_auth_token(self, token_type: str, token_hash: str, *, connection=None) -> Optional[str]:
        async with write_transaction(self._pool, connection) as conn:
            owner = await self.auth_token_user(token_type, token_hash, connection=conn)
            if owner is None:
                return None
            await conn.fetchrow("SELECT id FROM users.users WHERE id = $1 FOR UPDATE", UUID(owner))
            row = await conn.fetchrow(
                """UPDATE users.auth_tokens t
                   SET used_at = (clock_timestamp() AT TIME ZONE 'UTC')
                   WHERE t.id = (
                       SELECT id FROM users.auth_tokens
                       WHERE token_type = $1 AND token_hash = $2
                         AND used_at IS NULL AND expires_at > (clock_timestamp() AT TIME ZONE 'UTC')
                       ORDER BY created_at DESC, id DESC LIMIT 1
                   )
                     AND t.used_at IS NULL AND t.expires_at > (clock_timestamp() AT TIME ZONE 'UTC')
                   RETURNING t.user_id""",
                token_type,
                token_hash,
            )
            if not row:
                return None
            return str(row["user_id"])

    async def has_recent_auth_token(
        self,
        user_id: str,
        token_type: str,
        min_created_at: datetime,
    ) -> bool:
        if min_created_at.tzinfo is not None:
            min_created_at = min_created_at.astimezone(timezone.utc).replace(tzinfo=None)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT id
                   FROM users.auth_tokens
                   WHERE user_id = $1
                     AND token_type = $2
                     AND created_at >= $3
                   ORDER BY created_at DESC
                   LIMIT 1""",
                UUID(user_id),
                token_type,
                min_created_at,
            )
            return bool(row)

    async def create_session(
        self, user_id: str, jti: str, expires_at: datetime, *, expected_password_hash: Optional[str] = None,
        connection=None,
    ) -> bool:
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        async with write_transaction(self._pool, connection) as conn:
            if expected_password_hash is not None:
                current = await conn.fetchval(
                    "SELECT password_hash FROM users.users WHERE id = $1 FOR SHARE", UUID(user_id)
                )
                if current != expected_password_hash:
                    return False
            await conn.execute(
                """DELETE FROM users.sessions
                   WHERE user_id = $1 AND expires_at <= (clock_timestamp() AT TIME ZONE 'UTC')""",
                UUID(user_id),
            )
            await conn.execute(
                "INSERT INTO users.sessions (jti, user_id, expires_at) VALUES ($1, $2, $3)",
                UUID(jti),
                UUID(user_id),
                expires_at,
            )
            return True

    async def session_is_active(self, jti: str, user_id: str) -> bool:
        async with self._pool.acquire() as conn:
            return bool(await conn.fetchval(
                """SELECT 1 FROM users.sessions
                   WHERE jti = $1 AND user_id = $2
                     AND expires_at > (clock_timestamp() AT TIME ZONE 'UTC')""",
                UUID(jti),
                UUID(user_id),
            ))

    async def end_session(self, jti: str) -> None:
        async with self._pool.acquire() as conn:
            await conn.execute("DELETE FROM users.sessions WHERE jti = $1", UUID(jti))

    async def end_all_sessions(self, user_id: str, *, connection=None) -> None:
        async with write_transaction(self._pool, connection) as conn:
            await conn.execute("DELETE FROM users.sessions WHERE user_id = $1", UUID(user_id))

    async def delete_user(self, user_id: str) -> bool:
        async with self._pool.acquire() as conn:
            result = await conn.execute("DELETE FROM users.users WHERE id = $1", UUID(user_id))
            return result == "DELETE 1"
