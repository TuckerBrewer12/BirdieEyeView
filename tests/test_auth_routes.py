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
    monkeypatch.setattr(auth, "hash_password", lambda value: f"hashed:{value}")
    monkeypatch.setattr(auth, "hash_one_time_token", lambda value: f"digest:{value}")
    monkeypatch.setattr(auth, "generate_one_time_token", lambda: "t" * 32)
    monkeypatch.setattr(auth, "create_access_token", lambda user_id: f"jwt:{user_id}")
    monkeypatch.setattr(auth, "send_verification_email", MagicMock())
    monkeypatch.setattr(auth, "send_password_reset_email", MagicMock())


@pytest.mark.parametrize(
    ("environment_name", "builder", "expected_path"),
    [
        ("AUTH_VERIFY_URL_BASE", auth._build_verification_url, "/verify?token=token"),
        (
            "AUTH_PASSWORD_RESET_URL_BASE",
            auth._build_password_reset_url,
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

    assert auth._build_verification_url(make_http_request(), "token").endswith("/verify-email?token=token")
    assert auth._build_password_reset_url(make_http_request(), "token").endswith("/reset-password?token=token")


def test_auth_urls_use_api_fallback(monkeypatch):
    for name in ("AUTH_VERIFY_URL_BASE", "AUTH_PASSWORD_RESET_URL_BASE", "FRONTEND_URL"):
        monkeypatch.delenv(name, raising=False)

    assert "api/auth/verify-email" in auth._build_verification_url(make_http_request(), "token")
    assert "reset-password" in auth._build_password_reset_url(make_http_request(), "token")


def test_auth_helper_normalizes_email_and_fingerprint():
    assert auth._normalize_email(" ADA@EXAMPLE.COM ") == "ada@example.com"
    assert len(auth._email_fingerprint("ada@example.com")) == 12


@pytest.mark.parametrize(
    ("environment_name", "default", "expected"),
    [("DOES_NOT_EXIST", 7, 7), ("BAD_INT", 8, 8)],
)
def test_auth_integer_environment_uses_default(monkeypatch, environment_name, default, expected):
    if environment_name == "BAD_INT":
        monkeypatch.setenv(environment_name, "bad")
    else:
        monkeypatch.delenv(environment_name, raising=False)

    assert auth._env_int(environment_name, default) == expected


def test_auth_rate_limit_returns_retry_response():
    limiter = SimpleNamespace(check=MagicMock(return_value=(False, 12)))

    with pytest.raises(HTTPException) as raised:
        auth._check_auth_rate_limit(
            limiter=limiter,
            key="key",
            limit=0,
            window_seconds=0,
            detail="slow down",
        )

    assert (raised.value.status_code, raised.value.headers["Retry-After"]) == (429, "12")


def test_auth_cookie_is_http_only():
    response = Response()

    auth._set_auth_cookie(response, "jwt")

    assert "httponly" in response.headers["set-cookie"].lower()


def test_clear_auth_cookie_expires_cookie():
    response = Response()

    auth._clear_auth_cookie(response)

    assert "Max-Age=0" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_register_creates_user_and_verification(auth_user):
    db = make_auth_database(auth_user)
    request = RegisterRequest(name="Ada", email="ADA@example.com", password="password123")

    response = await auth.register(request, make_http_request(), db)

    assert response.requires_email_verification is True
    db.users.create_user.assert_awaited_once()
    db.users.create_auth_token.assert_awaited_once()
    auth.send_verification_email.assert_called_once()


@pytest.mark.asyncio
async def test_register_rejects_existing_email(auth_user):
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user
    request = RegisterRequest(name="Ada", email=auth_user.email, password="password123")

    with pytest.raises(HTTPException) as raised:
        await auth.register(request, make_http_request(), db)

    assert raised.value.status_code == 409


@pytest.mark.asyncio
async def test_register_rejects_missing_home_course(auth_user):
    db = make_auth_database(auth_user)
    db.courses.get_course.return_value = None
    request = RegisterRequest(
        name="Ada",
        email=auth_user.email,
        password="password123",
        home_course_id=str(uuid4()),
    )

    with pytest.raises(HTTPException) as raised:
        await auth.register(request, make_http_request(), db)

    assert raised.value.status_code == 400


@pytest.mark.asyncio
async def test_register_maps_duplicate_insert_to_conflict(auth_user):
    db = make_auth_database(auth_user)
    db.users.create_user.side_effect = DuplicateError("duplicate")
    request = RegisterRequest(name="Ada", email=auth_user.email, password="password123")

    with pytest.raises(HTTPException) as raised:
        await auth.register(request, make_http_request(), db)

    assert raised.value.status_code == 409


@pytest.mark.asyncio
async def test_verify_email_marks_user_verified(auth_user):
    db = make_auth_database(auth_user)
    db.users.consume_auth_token.return_value = auth_user.id

    response = await auth.verify_email(VerifyEmailRequest(token="t" * 20), Response(), db)

    assert "verified" in response.message.lower()
    db.users.mark_email_verified.assert_awaited_once_with(auth_user.id)


@pytest.mark.asyncio
async def test_verify_email_link_uses_same_verification_flow(auth_user):
    db = make_auth_database(auth_user)
    db.users.consume_auth_token.return_value = auth_user.id

    response = await auth.verify_email_from_link(Response(), "t" * 20, db)

    assert "verified" in response.message.lower()


@pytest.mark.asyncio
async def test_verify_email_rejects_invalid_token(auth_user):
    db = make_auth_database(auth_user)

    with pytest.raises(HTTPException) as raised:
        await auth._verify_email_token("bad-token", db)

    assert raised.value.status_code == 400


@pytest.mark.asyncio
async def test_resend_verification_returns_neutral_response(auth_user):
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user

    response = await auth.resend_verification(ResendVerificationRequest(email=auth_user.email), make_http_request(), db)

    assert "if this account exists" in response.message.lower()
    auth.send_verification_email.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("account_exists", [True, False])
async def test_resend_verification_skips_ineligible_account(auth_user, account_exists):
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user if account_exists else None
    db.users.has_recent_auth_token.return_value = True

    await auth.resend_verification(ResendVerificationRequest(email=auth_user.email), make_http_request(), db)

    auth.send_verification_email.assert_not_called()


@pytest.mark.asyncio
async def test_verification_email_failure_does_not_escape(monkeypatch, auth_user):
    db = make_auth_database(auth_user)
    monkeypatch.setattr(auth, "send_verification_email", MagicMock(side_effect=RuntimeError("smtp")))

    await auth._issue_verification_token(db, auth_user, make_http_request())

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
async def test_login_sets_token_and_clears_failures(monkeypatch):
    user_id = str(uuid4())
    db = make_auth_database()
    db.users.get_auth_user_by_email.return_value = make_auth_user_row(user_id)
    limiter = make_login_limiter()
    monkeypatch.setattr(auth, "login_rate_limiter", limiter)
    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: True)

    response = await auth.login(
        LoginRequest(email="ada@example.com", password="right"),
        make_http_request(),
        Response(),
        db,
    )

    assert response.access_token == f"jwt:{user_id}"
    assert limiter.register_success.call_count == 2


@pytest.mark.asyncio
async def test_login_rejects_unknown_credentials(monkeypatch):
    db = make_auth_database()
    limiter = make_login_limiter()
    monkeypatch.setattr(auth, "login_rate_limiter", limiter)

    with pytest.raises(HTTPException) as raised:
        await auth.login(
            LoginRequest(email="ada@example.com", password="wrong"),
            make_http_request(),
            Response(),
            db,
        )

    assert raised.value.status_code == 401
    assert limiter.register_failure.call_count == 2


@pytest.mark.asyncio
async def test_login_rejects_unverified_email(monkeypatch):
    db = make_auth_database()
    db.users.get_auth_user_by_email.return_value = make_auth_user_row(str(uuid4()), verified=False)
    limiter = make_login_limiter()
    monkeypatch.setattr(auth, "login_rate_limiter", limiter)
    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: True)

    with pytest.raises(HTTPException) as raised:
        await auth.login(
            LoginRequest(email="ada@example.com", password="right"),
            make_http_request(),
            Response(),
            db,
        )

    assert raised.value.status_code == 403


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
async def test_logout_returns_confirmation():
    response = await auth.logout(make_http_request(), Response())

    assert response.message == "Logged out."


@pytest.mark.asyncio
async def test_forgot_password_issues_reset_token(auth_user):
    auth_user.email_verified = True
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user

    response = await auth.forgot_password(ForgotPasswordRequest(email=auth_user.email), make_http_request(), db)

    assert "if this account exists" in response.message.lower()
    db.users.create_auth_token.assert_awaited_once()
    auth.send_password_reset_email.assert_called_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("account_exists", [True, False])
async def test_forgot_password_skips_ineligible_account(auth_user, account_exists):
    auth_user.email_verified = True
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user if account_exists else None
    db.users.has_recent_auth_token.return_value = True

    await auth.forgot_password(ForgotPasswordRequest(email=auth_user.email), make_http_request(), db)

    auth.send_password_reset_email.assert_not_called()


@pytest.mark.asyncio
async def test_password_reset_email_failure_does_not_escape(monkeypatch, auth_user):
    auth_user.email_verified = True
    db = make_auth_database(auth_user)
    db.users.get_user_by_email.return_value = auth_user
    monkeypatch.setattr(auth, "send_password_reset_email", MagicMock(side_effect=RuntimeError("smtp")))

    await auth.forgot_password(ForgotPasswordRequest(email=auth_user.email), make_http_request(), db)

    db.users.create_auth_token.assert_awaited_once()


@pytest.mark.asyncio
async def test_reset_password_updates_hash(auth_user):
    db = make_auth_database(auth_user)
    db.users.consume_auth_token.return_value = auth_user.id
    request = ResetPasswordRequest(token="t" * 20, new_password="newpassword")

    response = await auth.reset_password(request, make_http_request(), db)

    assert "has been reset" in response.message
    db.users.set_password_hash.assert_awaited_once_with(auth_user.id, "hashed:newpassword")


@pytest.mark.asyncio
async def test_reset_password_rejects_invalid_token(auth_user):
    db = make_auth_database(auth_user)
    request = ResetPasswordRequest(token="t" * 20, new_password="newpassword")

    with pytest.raises(HTTPException) as raised:
        await auth.reset_password(request, make_http_request(), db)

    assert raised.value.status_code == 400


@pytest.mark.asyncio
async def test_me_returns_authenticated_user(auth_user):
    response = await auth.me(auth_user)

    assert (response.user_id, response.email_verified) == (auth_user.id, False)
