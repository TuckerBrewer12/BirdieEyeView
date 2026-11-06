"""CRUD operations for the users.users table."""

import json
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import asyncpg

from models import User
from database.converters import user_from_row, user_to_row
from database.exceptions import DuplicateError, IntegrityError, NotFoundError


class UserRepositoryDB:
    """Async CRUD for users."""

    FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    FRIEND_CODE_LEN = 8

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    @staticmethod
    def _normalize_email(email: str) -> str:
        return email.strip().lower()

    def _generate_friend_code(self) -> str:
        return "GC" + "".join(secrets.choice(self.FRIEND_CODE_ALPHABET) for _ in range(self.FRIEND_CODE_LEN))

    # ================================================================
    # Read
    # ================================================================

    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID (without rounds)."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE id = $1", UUID(user_id))
            return user_from_row(row) if row else None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        normalized = self._normalize_email(email)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE LOWER(BTRIM(email)) = $1", normalized)
            return user_from_row(row) if row else None

    async def get_user_by_friend_code(self, friend_code: str) -> Optional[User]:
        """Get user by friend code."""
        normalized = friend_code.strip().upper()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users.users WHERE friend_code = $1", normalized)
            return user_from_row(row) if row else None

    # ================================================================
    # Create
    # ================================================================

    async def get_password_hash(self, email: str) -> Optional[str]:
        """Return only the password_hash for the given email (for auth use only)."""
        normalized = self._normalize_email(email)
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT password_hash FROM users.users WHERE LOWER(BTRIM(email)) = $1", normalized
            )
            return row["password_hash"] if row else None

    async def get_auth_user_by_email(self, email: str) -> Optional[dict]:
        """Return auth fields for a user by email."""
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

    async def get_auth_user_by_identity(self, provider: str, provider_user_id: str) -> Optional[dict]:
        """Return auth fields for a user linked to an external identity."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT u.id, u.name, u.email, u.password_hash, u.email_verified
                   FROM users.user_identities i
                   JOIN users.users u ON u.id = i.user_id
                   WHERE i.provider = $1
                     AND i.provider_user_id = $2""",
                provider,
                provider_user_id,
            )
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
        """Create a new user. Returns User with DB-generated id."""
        async with self._pool.acquire() as conn:
            return user_from_row(await self._insert_user(conn, user, password_hash))

    async def create_user_with_identity(
        self, user: User, *, provider: str, provider_user_id: str, provider_email: str
    ) -> User:
        """Create a password-less user and link its sign-in identity in one transaction.

        A duplicate email or an identity already linked elsewhere raises DuplicateError and leaves no user behind.
        """
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                row = await self._insert_user(conn, user, None)
                await self._insert_identity(conn, row["id"], provider, provider_user_id, provider_email)
                return user_from_row(row)

    async def _insert_user(self, conn: asyncpg.Connection, user: User, password_hash: Optional[str]) -> asyncpg.Record:
        """Insert a user row, retrying friend-code collisions. Each attempt is its own (sub)transaction."""
        data = user_to_row(user)
        normalized_email = self._normalize_email(data["email"])
        for _ in range(10):
            friend_code = data["friend_code"] or self._generate_friend_code()
            try:
                async with conn.transaction():
                    return await conn.fetchrow(
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
            except asyncpg.UniqueViolationError as e:
                # Retry for friend_code collisions; fail fast for email collisions.
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

    async def _insert_identity(
        self, conn: asyncpg.Connection, user_id: UUID, provider: str, provider_user_id: str, provider_email: str
    ) -> None:
        try:
            await conn.execute(
                """INSERT INTO users.user_identities (user_id, provider, provider_user_id, provider_email, email_verified)
                   VALUES ($1, $2, $3, $4, TRUE)""",
                user_id,
                provider,
                provider_user_id,
                self._normalize_email(provider_email),
            )
        except asyncpg.UniqueViolationError as e:
            raise DuplicateError(f"Identity already linked: {e}") from e

    # ================================================================
    # Update
    # ================================================================

    async def update_user(self, user_id: str, **fields) -> Optional[User]:
        """Update user fields (name, email, handicap_index, home_course_id, preferences)."""
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

        # Convert home_course_id string to UUID if present
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

    async def update_handicap(self, user_id: str, handicap: float) -> None:
        """Update handicap and set last_handicap_update to NOW()."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """UPDATE users.users
                   SET handicap_index = $2, last_handicap_update = NOW()
                   WHERE id = $1""",
                UUID(user_id),
                handicap,
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"User {user_id} not found")

    async def set_password_hash(self, user_id: str, password_hash: str) -> None:
        """Set a new password hash for the user."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE users.users SET password_hash = $2 WHERE id = $1",
                UUID(user_id),
                password_hash,
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"User {user_id} not found")

    async def mark_email_verified(self, user_id: str) -> None:
        """Mark email as verified."""
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                """UPDATE users.users
                   SET email_verified = TRUE, email_verified_at = NOW()
                   WHERE id = $1""",
                UUID(user_id),
            )
            if result == "UPDATE 0":
                raise NotFoundError(f"User {user_id} not found")

    async def link_identity_to_email_owner(
        self, user_id: str, *, provider: str, provider_user_id: str, provider_email: str
    ) -> dict:
        """Link a sign-in identity to the account that owns its (provider-verified) email.

        If that account never verified its email, whoever registered it never proved they own the address:
        the provider sign-in claims the account, so its password and any pending verification or reset links
        are discarded. Runs in one transaction with the user row locked. Returns the account's auth fields.
        """
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    "SELECT id, email_verified FROM users.users WHERE id = $1 FOR UPDATE", UUID(user_id)
                )
                if not row:
                    raise NotFoundError(f"User {user_id} not found")
                await self._insert_identity(conn, row["id"], provider, provider_user_id, provider_email)
                if not row["email_verified"]:
                    await conn.execute(
                        """UPDATE users.users
                           SET email_verified = TRUE, email_verified_at = NOW(), password_hash = NULL
                           WHERE id = $1""",
                        row["id"],
                    )
                    await conn.execute(
                        """UPDATE users.auth_tokens
                           SET used_at = (clock_timestamp() AT TIME ZONE 'UTC')
                           WHERE user_id = $1 AND used_at IS NULL""",
                        row["id"],
                    )
                auth = await conn.fetchrow(
                    "SELECT id, name, email, password_hash, email_verified FROM users.users WHERE id = $1", row["id"]
                )
        return {
            "id": str(auth["id"]),
            "name": auth["name"],
            "email": auth["email"],
            "password_hash": auth["password_hash"],
            "email_verified": bool(auth["email_verified"]),
        }

    async def create_auth_nonce(self, provider: str, nonce_hash: str, expires_at: datetime) -> None:
        """Store a one-time sign-in nonce (by hash), pruning nonces that expired over a day ago."""
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        async with self._pool.acquire() as conn:
            await conn.execute(
                "DELETE FROM users.auth_nonces WHERE expires_at < (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 day'"
            )
            await conn.execute(
                """INSERT INTO users.auth_nonces (provider, nonce_hash, expires_at, created_at)
                   VALUES ($1, $2, $3, clock_timestamp() AT TIME ZONE 'UTC')""",
                provider,
                nonce_hash,
                expires_at,
            )

    async def consume_auth_nonce(self, provider: str, nonce_hash: str) -> bool:
        """Use a nonce once. False when it is unknown, expired or already used."""
        async with self._pool.acquire() as conn:
            used = await conn.fetchval(
                """UPDATE users.auth_nonces
                   SET used_at = (clock_timestamp() AT TIME ZONE 'UTC')
                   WHERE provider = $1 AND nonce_hash = $2
                     AND used_at IS NULL AND expires_at > (clock_timestamp() AT TIME ZONE 'UTC')
                   RETURNING id""",
                provider,
                nonce_hash,
            )
        return used is not None

    async def create_auth_token(
        self,
        user_id: str,
        token_type: str,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        """Insert one-time auth token hash and invalidate older active tokens of the same type."""
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                # Serialize issuance on the existing parent row, even when no token exists yet.
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

    async def consume_auth_token(self, token_type: str, token_hash: str) -> Optional[str]:
        """Consume token if valid (not expired, not previously used) and return user_id."""
        async with self._pool.acquire() as conn:
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
        """Check for recent token issuance to reduce spammy resends."""
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

    # ================================================================
    # Delete
    # ================================================================

    async def delete_user(self, user_id: str) -> bool:
        """Delete user and all their rounds (CASCADE). Returns True if deleted."""
        async with self._pool.acquire() as conn:
            result = await conn.execute("DELETE FROM users.users WHERE id = $1", UUID(user_id))
            return result == "DELETE 1"
