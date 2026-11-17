import logging
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

from api.auth_utils import (
    create_access_token,
    decode_access_token,
    generate_one_time_token,
    hash_one_time_token,
    hash_password_async,
)
from database.db_manager import DatabaseManager
from models import User

logger = logging.getLogger(__name__)


async def start_session(
    db: DatabaseManager, user_id: str, *, expected_password_hash: Optional[str] = None, connection=None
) -> Optional[str]:
    issued = create_access_token(user_id)
    started = await db.users.create_session(
        user_id, issued.jti, issued.expires_at, expected_password_hash=expected_password_hash, connection=connection
    )
    return issued.token if started else None


async def end_sessions(db: DatabaseManager, *tokens: Optional[str]) -> None:
    for token in tokens:
        payload = decode_access_token(token) if token else None
        if payload and payload.get("jti"):
            await db.users.end_session(payload["jti"])


async def send_one_time_link(
    db: DatabaseManager,
    user: User,
    token_type: str,
    ttl_minutes: int,
    link_for: Callable[[str], str],
    send: Callable,
) -> None:
    raw_token = generate_one_time_token()
    await db.users.create_auth_token(
        user_id=str(user.id),
        token_type=token_type,
        token_hash=hash_one_time_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
    )
    try:
        await send(user.email or "", link_for(raw_token))
    except Exception:
        logger.exception("Auth %s email send failed: user_id=%s", token_type, user.id)


async def verify_email(db: DatabaseManager, raw_token: str) -> Optional[tuple[str, str]]:
    async with db.transaction() as conn:
        user_id = await db.users.consume_auth_token("email_verify", hash_one_time_token(raw_token), connection=conn)
        if not user_id:
            return None
        await db.users.mark_email_verified(user_id, connection=conn)
        return user_id, await start_session(db, user_id, connection=conn)


async def reset_password(db: DatabaseManager, raw_token: str, new_password: str) -> Optional[str]:
    token_hash = hash_one_time_token(raw_token)
    if await db.users.auth_token_user("password_reset", token_hash) is None:
        return None
    new_hash = await hash_password_async(new_password)
    async with db.transaction() as conn:
        user_id = await db.users.consume_auth_token("password_reset", token_hash, connection=conn)
        if not user_id:
            return None
        await db.users.set_password_hash(user_id, new_hash, connection=conn)
        await db.users.end_all_sessions(user_id, connection=conn)
        return user_id
