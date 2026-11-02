"""CRUD operations for users.friendships."""

import asyncpg
from typing import List, Optional
from uuid import UUID

from database.exceptions import DuplicateError


class FriendshipRepositoryDB:
    """Async CRUD for friendship requests and relationships."""

    VALID_STATUSES = {"pending", "accepted", "declined", "blocked"}

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    async def send_request(self, requester_id: str, addressee_id: str) -> dict:
        """Create/reopen a pair under a stable pair lock, including the initially absent row."""
        requester, addressee = UUID(requester_id), UUID(addressee_id)
        if requester == addressee:
            raise ValueError("Cannot friend yourself")
        pair_key = ":".join(sorted((str(requester), str(addressee))))
        async with self._pool.acquire() as conn, conn.transaction():
            await conn.execute("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", pair_key)
            row = await conn.fetchrow(
                """SELECT * FROM users.friendships
                   WHERE LEAST(requester_id,addressee_id)=LEAST($1::uuid,$2::uuid)
                     AND GREATEST(requester_id,addressee_id)=GREATEST($1::uuid,$2::uuid)
                   FOR UPDATE""",
                requester,
                addressee,
            )
            if row:
                if row["status"] == "accepted":
                    raise DuplicateError("Users are already friends")
                if row["status"] == "blocked":
                    raise DuplicateError("Friend request blocked for this pair")
                updated = await conn.fetchrow(
                    """UPDATE users.friendships SET requester_id=$1, addressee_id=$2, status='pending'
                       WHERE id=$3 RETURNING *""",
                    requester,
                    addressee,
                    row["id"],
                )
                return dict(updated)
            created = await conn.fetchrow(
                """INSERT INTO users.friendships (requester_id,addressee_id,status)
                   VALUES ($1,$2,'pending') RETURNING *""",
                requester,
                addressee,
            )
            return dict(created)

    async def update_status(self, friendship_id: str, actor_user_id: str, status: str) -> Optional[dict]:
        """Validate actor and current transition while holding the relationship row lock."""
        if status not in self.VALID_STATUSES or status == "pending":
            raise ValueError(f"Invalid status for a direct friendship update: {status}")
        actor = UUID(actor_user_id)
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow("SELECT * FROM users.friendships WHERE id=$1 FOR UPDATE", UUID(friendship_id))
            if not row:
                return None
            if status in {"accepted", "declined"}:
                if row["status"] != "pending" or row["addressee_id"] != actor:
                    return None
            elif actor not in (row["requester_id"], row["addressee_id"]):
                return None
            updated = await conn.fetchrow(
                "UPDATE users.friendships SET status=$2 WHERE id=$1 RETURNING *",
                row["id"],
                status,
            )
            return dict(updated) if updated else None

    async def list_for_user(self, user_id: str, status: Optional[str] = None) -> List[dict]:
        """List friendships where user is requester or addressee."""
        uid = UUID(user_id)
        async with self._pool.acquire() as conn:
            if status:
                rows = await conn.fetch(
                    """SELECT f.*,
                              ru.name AS requester_name,
                              ru.email AS requester_email,
                              au.name AS addressee_name,
                              au.email AS addressee_email
                       FROM users.friendships f
                       JOIN users.users ru ON ru.id = f.requester_id
                       JOIN users.users au ON au.id = f.addressee_id
                       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
                         AND f.status = $2
                       ORDER BY f.updated_at DESC""",
                    uid,
                    status,
                )
            else:
                rows = await conn.fetch(
                    """SELECT f.*,
                              ru.name AS requester_name,
                              ru.email AS requester_email,
                              au.name AS addressee_name,
                              au.email AS addressee_email
                       FROM users.friendships f
                       JOIN users.users ru ON ru.id = f.requester_id
                       JOIN users.users au ON au.id = f.addressee_id
                       WHERE f.requester_id = $1 OR f.addressee_id = $1
                       ORDER BY f.updated_at DESC""",
                    uid,
                )
            return [dict(r) for r in rows]

    async def are_friends(self, user_a_id: str, user_b_id: str) -> bool:
        """Return True when users have an accepted friendship in either direction."""
        a = UUID(user_a_id)
        b = UUID(user_b_id)
        if a == b:
            return True

        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT 1
                   FROM users.friendships
                   WHERE status = 'accepted'
                     AND ((requester_id = $1 AND addressee_id = $2)
                       OR (requester_id = $2 AND addressee_id = $1))
                   LIMIT 1""",
                a,
                b,
            )
            return row is not None
