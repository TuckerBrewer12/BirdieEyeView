from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest

from database.exceptions import DuplicateError
from models import User
from tests.integration.helpers import create_user


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_create_user_normalizes_email(database_manager):
    created = await database_manager.users.create_user(
        User(name="Ada Golfer", email="  ADA@EXAMPLE.COM ", handicap=7.2),
        password_hash="initial-password-hash",
    )

    assert created.email == "ada@example.com"


async def test_create_user_generates_friend_code(database_manager):
    created = await create_user(database_manager, email="ada@example.com")

    assert created.friend_code.startswith("GC")
    assert len(created.friend_code) == 10


async def test_user_lookups_normalize_email_and_friend_code(database_manager):
    created = await create_user(database_manager, email="ada@example.com")

    found_by_email = await database_manager.users.get_user_by_email(" ADA@EXAMPLE.COM ")
    found_by_code = await database_manager.users.get_user_by_friend_code(
        created.friend_code.lower()
    )

    assert found_by_email.id == created.id
    assert found_by_code.id == created.id


async def test_auth_lookup_returns_authentication_fields(database_manager):
    created = await database_manager.users.create_user(
        User(name="Ada Golfer", email="ada@example.com", email_verified=False),
        password_hash="initial-password-hash",
    )

    auth_user = await database_manager.users.get_auth_user_by_email(" ADA@EXAMPLE.COM ")

    assert auth_user == {
        "id": created.id,
        "name": "Ada Golfer",
        "email": "ada@example.com",
        "password_hash": "initial-password-hash",
        "email_verified": False,
    }


async def test_update_user_persists_profile_fields(database_manager):
    created = await create_user(database_manager, email="ada@example.com")

    updated = await database_manager.users.update_user(
        created.id,
        name="Ada Updated",
        handicap_index=6.4,
        scoring_goal=89,
    )

    assert (updated.name, updated.handicap, updated.scoring_goal) == (
        "Ada Updated",
        6.4,
        89,
    )
    assert updated.last_handicap_update is not None


async def test_update_user_persists_jsonb_preferences(database_manager, postgres_pool):
    created = await create_user(database_manager, email="ada@example.com")

    await database_manager.users.update_user(
        created.id,
        preferences={"distance_unit": "yards"},
    )

    async with postgres_pool.acquire() as connection:
        preferences = await connection.fetchval(
            "SELECT preferences FROM users.users WHERE id = $1",
            UUID(created.id),
        )
    assert preferences == '{"distance_unit": "yards"}'


async def test_set_password_hash_updates_authentication_value(database_manager):
    created = await create_user(database_manager, email="ada@example.com")

    await database_manager.users.set_password_hash(created.id, "updated-password-hash")

    password_hash = await database_manager.users.get_password_hash("ada@example.com")
    assert password_hash == "updated-password-hash"


async def test_mark_email_verified_updates_authentication_value(database_manager):
    created = await database_manager.users.create_user(
        User(name="Ada Golfer", email="ada@example.com", email_verified=False),
        password_hash="initial-password-hash",
    )

    await database_manager.users.mark_email_verified(created.id)

    auth_user = await database_manager.users.get_auth_user_by_email("ada@example.com")
    assert auth_user["email_verified"] is True


async def test_auth_token_is_recent_and_single_use(database_manager):
    created = await create_user(database_manager, email="ada@example.com")
    now = datetime.now(timezone.utc)
    token_hash = "a" * 64

    await database_manager.users.create_auth_token(
        created.id,
        "password_reset",
        token_hash,
        now + timedelta(minutes=10),
    )

    is_recent = await database_manager.users.has_recent_auth_token(
        created.id,
        "password_reset",
        now - timedelta(minutes=1),
    )
    first_consumption = await database_manager.users.consume_auth_token(
        "password_reset",
        token_hash,
    )
    second_consumption = await database_manager.users.consume_auth_token(
        "password_reset",
        token_hash,
    )

    assert is_recent is True
    assert (first_consumption, second_consumption) == (created.id, None)


async def test_duplicate_email_raises_duplicate_error(database_manager):
    await create_user(database_manager, email="ada@example.com")

    with pytest.raises(DuplicateError):
        await create_user(database_manager, email="ADA@example.com")


async def test_delete_user_removes_user(database_manager):
    created = await create_user(database_manager, email="ada@example.com")

    deleted = await database_manager.users.delete_user(created.id)

    assert deleted is True
    assert await database_manager.users.get_user(created.id) is None
