import asyncpg
from typing import List, Optional
from uuid import UUID

from database.exceptions import (
    AlreadyFriendsError, FriendRequestBlockedError, RequestAlreadySentError, RequestAwaitingYouError, YouBlockedError,
)

_JOINED = """SELECT f.*, ru.name AS requester_name, au.name AS addressee_name
             FROM users.friendships f
             JOIN users.users ru ON ru.id = f.requester_id
             JOIN users.users au ON au.id = f.addressee_id"""


class FriendshipRepositoryDB:
    VALID_STATUSES = frozenset({"pending", "accepted", "declined", "blocked"})

    def __init__(self, pool: asyncpg.Pool):
        self._pool = pool

    @staticmethod
    async def _joined(conn, friendship_id: UUID) -> dict:
        return dict(await conn.fetchrow(f"{_JOINED} WHERE f.id = $1", friendship_id))

    async def send_request(self, requester_id: str, addressee_id: str) -> dict:
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
            if row is None:
                created = await conn.fetchrow(
                    """INSERT INTO users.friendships (requester_id,addressee_id,status)
                       VALUES ($1,$2,'pending') RETURNING id""",
                    requester,
                    addressee,
                )
                return await self._joined(conn, created["id"])
            sent_by_actor = row["requester_id"] == requester
            if row["status"] == "accepted":
                raise AlreadyFriendsError("Users are already friends")
            if row["status"] == "pending":
                if sent_by_actor:
                    raise RequestAlreadySentError("Request already sent")
                raise RequestAwaitingYouError("The other user already sent a request")
            if row["status"] == "blocked" and sent_by_actor:
                raise YouBlockedError("The actor blocked this user")
            if sent_by_actor or row["status"] == "blocked":
                raise FriendRequestBlockedError("Friend request blocked for this pair")
            await conn.execute(
                """UPDATE users.friendships SET requester_id=$1, addressee_id=$2, status='pending'
                   WHERE id=$3""",
                requester,
                addressee,
                row["id"],
            )
            return await self._joined(conn, row["id"])

    async def update_status(self, friendship_id: str, actor_user_id: str, status: str) -> Optional[dict]:
        if status not in self.VALID_STATUSES or status == "pending":
            raise ValueError(f"Invalid status for a direct friendship update: {status}")
        actor = UUID(actor_user_id)
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow("SELECT * FROM users.friendships WHERE id=$1 FOR UPDATE", UUID(friendship_id))
            if not row or actor not in (row["requester_id"], row["addressee_id"]) or row["status"] == "blocked":
                return None
            if row["status"] == "declined" and row["requester_id"] == actor:
                return None
            if status in {"accepted", "declined"}:
                if row["status"] != "pending" or row["addressee_id"] != actor:
                    return None
                await conn.execute(
                    "UPDATE users.friendships SET status=$2 WHERE id=$1", row["id"], status
                )
            else:
                other = row["addressee_id"] if row["requester_id"] == actor else row["requester_id"]
                await conn.execute(
                    """UPDATE users.friendships SET status='blocked', requester_id=$2, addressee_id=$3
                       WHERE id=$1""",
                    row["id"],
                    actor,
                    other,
                )
            return await self._joined(conn, row["id"])

    async def remove(self, friendship_id: str, actor_user_id: str) -> bool:
        actor = UUID(actor_user_id)
        async with self._pool.acquire() as conn, conn.transaction():
            row = await conn.fetchrow("SELECT * FROM users.friendships WHERE id=$1 FOR UPDATE", UUID(friendship_id))
            if not row or actor not in (row["requester_id"], row["addressee_id"]):
                return False
            allowed = {
                "accepted": True,
                "pending": True,
                "declined": row["addressee_id"] == actor,
                "blocked": row["requester_id"] == actor,
            }
            if not allowed[row["status"]]:
                return False
            await conn.execute("DELETE FROM users.friendships WHERE id=$1", row["id"])
            return True

    async def list_for_user(self, user_id: str, status: Optional[str] = None) -> List[dict]:
        uid = UUID(user_id)
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                f"""{_JOINED}
                    WHERE (f.requester_id = $1 OR f.addressee_id = $1)
                      AND NOT (f.status = 'blocked' AND f.addressee_id = $1)
                      AND ($2::text IS NULL OR f.status = $2)
                    ORDER BY f.updated_at DESC, f.id""",
                uid,
                status,
            )
            return [dict(r) for r in rows]

    async def are_friends(self, user_a_id: str, user_b_id: str) -> bool:
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
