from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Response

from api.auth_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from api import auth_http
from api.routers import auth
from api.security import env_int
from services import auth_service
from database.exceptions import DuplicateError
from models import User
from tests.helpers import make_async_repo, make_http_request, make_mock_database


def make_auth_database(user: User | None = None):
    return make_mock_database(
        users=make_async_repo(
            get_user_by_email=None,
            create_user=user,
            create_auth_token=None,
            consume_auth_token=None,
            mark_email_verified=None,
            has_recent_auth_token=False,
            get_auth_user_by_email=None,
            set_password_hash=None,
        ),
        courses=make_async_repo(get_course=object()),
    )


@pytest.fixture
def auth_user():
    return User(id=str(uuid4()), name="Ada", email="ada@example.com", email_verified=False)


@pytest.fixture(autouse=True)
def auth_isolation(monkeypatch):
    allowing_limiter = SimpleNamespace(check=MagicMock(return_value=(True, 0)))
    monkeypatch.setattr(auth, "register_rate_limiter", allowing_limiter)
    monkeypatch.setattr(auth, "auth_request_rate_limiter", allowing_limiter)
    monkeypatch.setattr(auth, "hash_password_async", AsyncMock(side_effect=lambda value: f"hashed:{value}"))
    monkeypatch.setattr(auth, "send_verification_email", AsyncMock())
    monkeypatch.setattr(auth, "send_password_reset_email", AsyncMock())


@pytest.mark.parametrize(
    ("environment_name", "builder", "expected_path"),
    [
        ("AUTH_VERIFY_URL_BASE", auth_http.verification_link, "/verify?token=token"),
        (
            "AUTH_PASSWORD_RESET_URL_BASE",
            auth_http.password_reset_link,
            "/reset?token=token",
        ),
    ],
)
def test_auth_url_uses_configured_base(monkeypatch, environment_name, builder, expected_path):
    monkeypatch.setenv(environment_name, f"https://app.test{expected_path.split('?')[0]}/")

    assert builder(make_http_request(), "token") == f"https://app.test{expected_path}"


def test_auth_urls_use_frontend_fallback(monkeypatch):
    monkeypatch.delenv("AUTH_VERIFY_URL_BASE", raising=False)
    monkeypatch.delenv("AUTH_PASSWORD_RESET_URL_BASE", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.test/")

    assert auth_http.verification_link(make_http_request(), "token").endswith("/verify-email?token=token")
    assert auth_http.password_reset_link(make_http_request(), "token").endswith("/reset-password?token=token")


def test_auth_urls_use_api_fallback(monkeypatch):
    for name in ("AUTH_VERIFY_URL_BASE", "AUTH_PASSWORD_RESET_URL_BASE", "FRONTEND_URL"):
        monkeypatch.delenv(name, raising=False)

    assert "api/auth/verify-email" in auth_http.verification_link(make_http_request(), "token")
    assert "reset-password" in auth_http.password_reset_link(make_http_request(), "token")


def test_auth_helper_fingerprints_email():
    assert len(auth_http.email_fingerprint("ada@example.com")) == 12


@pytest.mark.parametrize(
    ("environment_name", "default", "expected"),
    [("DOES_NOT_EXIST", 7, 7), ("BAD_INT", 8, 8)],
)
def test_auth_integer_environment_uses_default(monkeypatch, environment_name, default, expected):
    if environment_name == "BAD_INT":
        monkeypatch.setenv(environment_name, "bad")
    else:
        monkeypatch.delenv(environment_name, raising=False)

    assert env_int(environment_name, default) == expected


def test_auth_rate_limit_returns_retry_response():
    limiter = SimpleNamespace(check=MagicMock(return_value=(False, 12)))

    with pytest.raises(HTTPException) as raised:
        auth_http.check_rate_limit(limiter, "key", 0, 0, "slow down")

    assert (raised.value.status_code, raised.value.headers["Retry-After"]) == (429, "12")


@pytest.mark.asyncio
async def test_resend_verification_returns_neutral_response(auth_user):
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user

    response = await auth.resend_verification(ResendVerificationRequest(email=auth_user.email), make_http_request(), db)

    assert "if this account exists" in response.message.lower()
    auth.send_verification_email.assert_awaited_once()


@pytest.mark.asyncio
async def test_verification_email_failure_does_not_escape(monkeypatch, auth_user):
    db = make_auth_database(auth_user)
    failing_send = AsyncMock(side_effect=RuntimeError("smtp"))

    await auth_service.send_one_time_link(db, auth_user, "email_verify", 5, lambda token: f"link:{token}", failing_send)

    db.users.create_auth_token.assert_awaited_once()


def make_login_limiter():
    return SimpleNamespace(
        retry_after=MagicMock(return_value=None),
        register_failure=MagicMock(),
        register_success=MagicMock(),
    )


def make_auth_user_row(user_id, *, verified=True):
    return {
        "id": user_id,
        "name": "Ada",
        "email": "ada@example.com",
        "password_hash": "hash",
        "email_verified": verified,
    }


@pytest.mark.asyncio
async def test_login_respects_attempt_lockout(monkeypatch):
    db = make_auth_database()
    limiter = make_login_limiter()
    limiter.retry_after.return_value = 15
    monkeypatch.setattr(auth, "login_rate_limiter", limiter)

    with pytest.raises(HTTPException) as raised:
        await auth.login(
            LoginRequest(email="ada@example.com", password="right"),
            make_http_request(),
            Response(),
            db,
        )

    assert (raised.value.status_code, raised.value.headers["Retry-After"]) == (429, "15")


@pytest.mark.asyncio
async def test_password_reset_email_failure_does_not_escape(monkeypatch, auth_user):
    auth_user.email_verified = True
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user
    monkeypatch.setattr(auth, "send_password_reset_email", AsyncMock(side_effect=RuntimeError("smtp")))

    await auth.forgot_password(ForgotPasswordRequest(email=auth_user.email), make_http_request(), db)

    db.users.create_auth_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_register_rejects_another_users_private_home_course(auth_user):
    from tests.helpers import make_course

    db = make_auth_database(auth_user)
    db.courses.get_course.return_value = make_course(uuid4(), owner=uuid4())
    request = RegisterRequest(
        name="Ada", email="ada@example.com", password="password123", home_course_id=str(uuid4())
    )

    with pytest.raises(HTTPException) as raised:
        await auth.register(request, make_http_request(), db)

    assert raised.value.status_code == 403
    db.users.create_user.assert_not_awaited()


@pytest.mark.asyncio
async def test_invalid_reset_token_is_refused_before_hashing(monkeypatch):
    db = make_auth_database()
    db.users.auth_token_user = AsyncMock(return_value=None)
    hashing = AsyncMock()
    monkeypatch.setattr(auth_service, "hash_password_async", hashing)

    assert await auth_service.reset_password(db, "x" * 32, "a brand new password") is None
    hashing.assert_not_awaited()
