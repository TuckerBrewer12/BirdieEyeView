from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import api.dependencies as dependencies
from models import User
from tests.helpers import make_http_request


def test_malformed_proxy_address_is_not_trusted(monkeypatch):
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "bad,10.0.0.0/8")

    assert dependencies._peer_is_trusted_proxy("not-an-ip") is False


def test_database_dependency_returns_application_database():
    app = SimpleNamespace(state=SimpleNamespace(db_manager="db"))

    assert dependencies.get_db(make_http_request(app=app)) == "db"


def test_database_dependency_returns_generic_unavailable_error():
    with pytest.raises(HTTPException) as raised:
        dependencies.get_db(make_http_request())

    assert (raised.value.status_code, raised.value.detail) == (
        503,
        "Service is temporarily unavailable. Please try again shortly.",
    )
    assert "database" not in raised.value.detail.lower()


@pytest.fixture
def auth_database():
    return SimpleNamespace(users=SimpleNamespace(get_user=AsyncMock(return_value=User(id="u1"))))


@pytest.mark.asyncio
async def test_current_user_accepts_cookie_token(monkeypatch, auth_database):
    request = make_http_request(cookies="golf_access_token=cookie-token")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {"sub": "u1"})

    user = await dependencies.get_current_user(request, None, auth_database)

    assert user.id == "u1"
    auth_database.users.get_user.assert_awaited_once_with("u1")


@pytest.mark.asyncio
async def test_optional_current_user_accepts_bearer_token(monkeypatch, auth_database):
    request = make_http_request()
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bearer-token")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {"sub": "u1"})

    user = await dependencies.get_optional_current_user(request, credentials, auth_database)

    assert user.id == "u1"
    auth_database.users.get_user.assert_awaited_once_with("u1")


@pytest.mark.asyncio
async def test_current_user_rejects_invalid_token(monkeypatch, auth_database):
    request = make_http_request(cookies="golf_access_token=invalid")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: None)

    with pytest.raises(HTTPException, match="Invalid or expired"):
        await dependencies.get_current_user(request, None, auth_database)


@pytest.mark.asyncio
async def test_optional_current_user_ignores_invalid_token(monkeypatch, auth_database):
    request = make_http_request(cookies="golf_access_token=invalid")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: None)

    assert await dependencies.get_optional_current_user(request, None, auth_database) is None


@pytest.mark.asyncio
async def test_current_user_requires_token(auth_database):
    with pytest.raises(HTTPException, match="Not authenticated"):
        await dependencies.get_current_user(make_http_request(), None, auth_database)


@pytest.mark.asyncio
async def test_optional_current_user_allows_missing_token(auth_database):
    assert await dependencies.get_optional_current_user(make_http_request(), None, auth_database) is None


@pytest.mark.asyncio
async def test_optional_current_user_rejects_token_without_subject(monkeypatch, auth_database):
    request = make_http_request(cookies="golf_access_token=token")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {})

    assert await dependencies.get_optional_current_user(request, None, auth_database) is None


@pytest.mark.asyncio
async def test_current_user_rejects_missing_user(monkeypatch, auth_database):
    request = make_http_request(cookies="golf_access_token=token")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {"sub": "missing"})
    auth_database.users.get_user.return_value = None

    with pytest.raises(HTTPException, match="User not found"):
        await dependencies.get_current_user(request, None, auth_database)
