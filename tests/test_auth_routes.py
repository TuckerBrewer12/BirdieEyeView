from types import SimpleNamespace
from unittest.mock import MagicMock
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
from api.routers import auth
from database.exceptions import DuplicateError
from models import User
from tests.helpers import make_async_repo, make_http_request, make_mock_database


def _make_auth_database(user: User | None = None):
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


@pytest.fixture(autouse=True)
def auth_isolation(monkeypatch):
    allowing_limiter = SimpleNamespace(check=MagicMock(return_value=(True, 0)))
    monkeypatch.setattr(auth, "register_rate_limiter", allowing_limiter)
    monkeypatch.setattr(auth, "auth_request_rate_limiter", allowing_limiter)
    monkeypatch.setattr(auth, "hash_password", lambda value: f"hashed:{value}")
    monkeypatch.setattr(auth, "hash_one_time_token", lambda value: f"digest:{value}")
    monkeypatch.setattr(auth, "generate_one_time_token", lambda: "t" * 32)
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"jwt:{user_id}")
    monkeypatch.setattr(auth, "send_verification_email", MagicMock())
    monkeypatch.setattr(auth, "send_password_reset_email", MagicMock())


def test_auth_helpers_urls_rate_limits_and_cookies(monkeypatch):
    monkeypatch.setenv("AUTH_VERIFY_URL_BASE", "https://app.test/verify/")
    monkeypatch.setenv("AUTH_PASSWORD_RESET_URL_BASE", "https://app.test/reset/")
    assert auth._build_verification_url(make_http_request(), "token") == "https://app.test/verify?token=token"
    assert auth._build_password_reset_url(make_http_request(), "token") == "https://app.test/reset?token=token"

    monkeypatch.delenv("AUTH_VERIFY_URL_BASE")
    monkeypatch.delenv("AUTH_PASSWORD_RESET_URL_BASE")
    monkeypatch.setenv("FRONTEND_URL", "https://frontend.test/")
    assert auth._build_verification_url(make_http_request(), "token").endswith("/verify-email?token=token")
    assert auth._build_password_reset_url(make_http_request(), "token").endswith("/reset-password?token=token")
    monkeypatch.delenv("FRONTEND_URL")
    assert "api/auth/verify-email" in auth._build_verification_url(make_http_request(), "token")
    assert "reset-password" in auth._build_password_reset_url(make_http_request(), "token")

    assert auth._env_int("DOES_NOT_EXIST", 7) == 7
    monkeypatch.setenv("BAD_INT", "bad")
    assert auth._env_int("BAD_INT", 8) == 8
    assert auth._normalize_email(" ADA@EXAMPLE.COM ") == "ada@example.com"
    assert len(auth._email_fingerprint("ada@example.com")) == 12

    blocked_limiter = SimpleNamespace(check=MagicMock(return_value=(False, 12)))
    with pytest.raises(HTTPException) as exc:
        auth._check_auth_rate_limit(
            limiter=blocked_limiter,
            key="key",
            limit=0,
            window_seconds=0,
            detail="slow down",
        )
    assert exc.value.status_code == 429

    response = Response()
    auth._set_auth_cookie(response, "jwt")
    assert "httponly" in response.headers["set-cookie"].lower()
    auth._clear_auth_cookie(response)
    assert "Max-Age=0" in response.headers.getlist("set-cookie")[-1]


@pytest.mark.asyncio
async def test_register_success_duplicate_and_home_course_errors():
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com", email_verified=False)
    db = _make_auth_database(user)
    registration_request = RegisterRequest(name="Ada", email="ADA@example.com", password="password123")

    registration_response = await auth.register(registration_request, make_http_request(), db)
    assert registration_response.requires_email_verification is True
    db.users.create_user.assert_awaited_once()
    db.users.create_auth_token.assert_awaited_once()
    auth.send_verification_email.assert_called_once()

    db.users.get_user_by_email.return_value = user
    with pytest.raises(HTTPException) as exc:
        await auth.register(registration_request, make_http_request(), db)
    assert exc.value.status_code == 409

    db.users.get_user_by_email.return_value = None
    db.courses.get_course.return_value = None
    registration_with_home_course = RegisterRequest(
        name="Ada",
        email="ada@example.com",
        password="password123",
        home_course_id=str(uuid4()),
    )
    with pytest.raises(HTTPException) as exc:
        await auth.register(registration_with_home_course, make_http_request(), db)
    assert exc.value.status_code == 400

    db.courses.get_course.return_value = object()
    db.users.create_user.side_effect = DuplicateError("duplicate")
    with pytest.raises(HTTPException) as exc:
        await auth.register(registration_with_home_course, make_http_request(), db)
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_verification_resend_and_email_failure(monkeypatch):
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com", email_verified=False)
    db = _make_auth_database(user)
    db.users.consume_auth_token.return_value = user.id
    response = Response()

    verification_response = await auth.verify_email(VerifyEmailRequest(token="t" * 20), response, db)
    assert "verified" in verification_response.message.lower()
    db.users.mark_email_verified.assert_awaited_once_with(user.id)

    response = Response()
    link_verification_response = await auth.verify_email_from_link(response, "t" * 20, db)
    assert "verified" in link_verification_response.message.lower()

    db.users.consume_auth_token.return_value = None
    with pytest.raises(HTTPException) as exc:
        await auth._verify_email_token("bad-token", db)
    assert exc.value.status_code == 400

    db.users.get_user_by_email.return_value = user
    db.users.has_recent_auth_token.return_value = False
    resend_response = await auth.resend_verification(
        ResendVerificationRequest(email=user.email), make_http_request(), db
    )
    assert "if this account exists" in resend_response.message.lower()

    db.users.has_recent_auth_token.return_value = True
    await auth.resend_verification(ResendVerificationRequest(email=user.email), make_http_request(), db)
    db.users.get_user_by_email.return_value = None
    await auth.resend_verification(ResendVerificationRequest(email=user.email), make_http_request(), db)

    monkeypatch.setattr(auth, "send_verification_email", MagicMock(side_effect=RuntimeError("smtp")))
    await auth._issue_verification_token(db, user, make_http_request())


@pytest.mark.asyncio
async def test_login_success_failures_lockout_and_logout(monkeypatch):
    user_id = str(uuid4())
    db = _make_auth_database()
    auth_user_row = {
        "id": user_id,
        "name": "Ada",
        "email": "ada@example.com",
        "password_hash": "hash",
        "email_verified": True,
    }
    login_attempt_limiter = SimpleNamespace(
        retry_after=MagicMock(return_value=None),
        register_failure=MagicMock(),
        register_success=MagicMock(),
    )
    monkeypatch.setattr(auth, "login_rate_limiter", login_attempt_limiter)
    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: password == "right")
    login_request = LoginRequest(email="ada@example.com", password="right")

    db.users.get_auth_user_by_email.return_value = auth_user_row
    response = Response()
    login_response = await auth.login(login_request, make_http_request(), response, db)
    assert login_response.access_token == f"jwt:{user_id}"
    assert login_attempt_limiter.register_success.call_count == 2

    db.users.get_auth_user_by_email.return_value = None
    with pytest.raises(HTTPException) as exc:
        await auth.login(login_request, make_http_request(), Response(), db)
    assert exc.value.status_code == 401
    assert login_attempt_limiter.register_failure.call_count == 2

    db.users.get_auth_user_by_email.return_value = {**auth_user_row, "email_verified": False}
    with pytest.raises(HTTPException) as exc:
        await auth.login(login_request, make_http_request(), Response(), db)
    assert exc.value.status_code == 403

    login_attempt_limiter.retry_after.return_value = 15
    with pytest.raises(HTTPException) as exc:
        await auth.login(login_request, make_http_request(), Response(), db)
    assert exc.value.status_code == 429
    assert exc.value.headers["Retry-After"] == "15"

    response = Response()
    logout_response = await auth.logout(make_http_request(), response)
    assert logout_response.message == "Logged out."


@pytest.mark.asyncio
async def test_forgot_and_reset_password_branches(monkeypatch):
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com", email_verified=True)
    db = _make_auth_database(user)
    db.users.get_user_by_email.return_value = user
    forgot_password_request = ForgotPasswordRequest(email=user.email)

    forgot_password_response = await auth.forgot_password(forgot_password_request, make_http_request(), db)
    assert "if this account exists" in forgot_password_response.message.lower()
    db.users.create_auth_token.assert_awaited_once()
    auth.send_password_reset_email.assert_called_once()

    db.users.has_recent_auth_token.return_value = True
    await auth.forgot_password(forgot_password_request, make_http_request(), db)
    db.users.get_user_by_email.return_value = None
    await auth.forgot_password(forgot_password_request, make_http_request(), db)

    monkeypatch.setattr(auth, "send_password_reset_email", MagicMock(side_effect=RuntimeError("smtp")))
    db.users.get_user_by_email.return_value = user
    db.users.has_recent_auth_token.return_value = False
    await auth.forgot_password(forgot_password_request, make_http_request(), db)

    reset_password_request = ResetPasswordRequest(token="t" * 20, new_password="newpassword")
    db.users.consume_auth_token.return_value = user.id
    reset_password_response = await auth.reset_password(reset_password_request, make_http_request(), db)
    assert "has been reset" in reset_password_response.message
    db.users.set_password_hash.assert_awaited_with(user.id, "hashed:newpassword")

    db.users.consume_auth_token.return_value = None
    with pytest.raises(HTTPException) as exc:
        await auth.reset_password(reset_password_request, make_http_request(), db)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_me_returns_authenticated_user():
    user = User(id=str(uuid4()), name="Ada", email="ada@example.com", email_verified=True)
    authenticated_user = await auth.me(user)
    assert authenticated_user.user_id == user.id
    assert authenticated_user.email_verified is True
