from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from pydantic import ValidationError

import api.auth_utils as auth_utils
import api.dependencies as dependencies
import api.main as api_main
import api.security as security
from api.auth_schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
)
from api.input_validation import (
    ensure_uuid_str,
    normalize_email,
    normalize_handicap_value,
    sanitize_ocr_text,
    sanitize_search_query,
    sanitize_user_text,
)
from api.request_models import HoleScoreInput, SaveRoundRequest, TeeInput
from models import User
from tests.helpers import make_http_request


def test_input_validation_happy_paths():
    value = str(uuid4())
    assert ensure_uuid_str(value.upper(), "id") == value
    assert normalize_email("  Golfer@Example.COM ") == "golfer@example.com"
    assert sanitize_user_text("  A\r\nName  ", field_name="name", max_length=30) == "A  Name"
    assert sanitize_user_text(
        "line one\r\nline two", field_name="notes", max_length=30, allow_newlines=True
    ) == "line one\nline two"
    assert sanitize_user_text("", field_name="optional", max_length=10, allow_empty=True) == ""
    assert sanitize_search_query("Pebble Beach") == "Pebble Beach"
    assert sanitize_ocr_text("one\r\ntwo") == "one\ntwo"


@pytest.mark.parametrize(
    ("call", "message"),
    [
        (lambda: ensure_uuid_str("nope", "course_id"), "valid UUID"),
        (lambda: normalize_email("not-an-email"), "Invalid email"),
        (lambda: sanitize_user_text("", field_name="name", max_length=5), "cannot be empty"),
        (lambda: sanitize_user_text("123456", field_name="name", max_length=5), "at most 5"),
        (lambda: sanitize_user_text("bad\x01", field_name="name", max_length=10), "control"),
        (lambda: sanitize_user_text("<b>x</b>", field_name="name", max_length=20), "HTML"),
        (lambda: sanitize_search_query("x UNION SELECT y"), "unsafe"),
        (lambda: sanitize_ocr_text("1234", max_length=3), "maximum size"),
        (lambda: sanitize_ocr_text("bad\x02"), "control"),
    ],
)
def test_input_validation_rejections(call, message):
    with pytest.raises(ValueError, match=message):
        call()


def test_handicap_normalization_paths():
    assert normalize_handicap_value(None) is None
    assert normalize_handicap_value(" ") is None
    assert normalize_handicap_value("+3.2") == -3.2
    assert normalize_handicap_value("12.4") == "12.4"
    assert normalize_handicap_value(-2.0) == -2.0
    with pytest.raises(ValueError, match="Invalid handicap"):
        normalize_handicap_value("+")
    with pytest.raises(ValueError, match="Invalid handicap"):
        normalize_handicap_value("+bad")


def test_auth_and_request_schema_contracts():
    home_course_id = str(uuid4())
    registration = RegisterRequest(
        name=" Golfer ",
        email=" GOLFER@example.com ",
        password="password123",
        home_course_id=home_course_id,
    )
    assert registration.name == "Golfer"
    assert registration.email == "golfer@example.com"
    assert registration.home_course_id == home_course_id
    assert LoginRequest(email="A@B.COM", password="x").email == "a@b.com"
    assert ResendVerificationRequest(email="A@B.COM").email == "a@b.com"
    assert ForgotPasswordRequest(email="A@B.COM").email == "a@b.com"

    request = SaveRoundRequest(
        course_id=home_course_id,
        external_course_id=" ext-1 ",
        course_location=" Monterey ",
        tee_box=" Blue ",
        tee_yardages={"1": 410},
        all_tees=[TeeInput(color="Blue", hole_yardages={"1": 410, "2": None})],
        hole_scores=[HoleScoreInput(hole_number=1, strokes=4, putts=2)],
        course_holes=[{"hole_number": 1, "par": 4}],
        date="2026-09-04",
        notes="line one\r\nline two",
    )
    assert request.course_location == "Monterey"
    assert request.tee_box == "Blue"
    assert request.notes == "line one\nline two"
    assert request.all_tees[0].hole_yardages == {"1": 410, "2": None}


@pytest.mark.parametrize(
    "payload",
    [
        {"hole_scores": [{"hole_number": 1, "strokes": 2, "putts": 3}]},
        {"hole_scores": [{"hole_number": 1}, {"hole_number": 1}]},
        {"hole_scores": [{"hole_number": 1}], "course_holes": [{"hole_number": 1}, {"hole_number": 1}]},
        {"hole_scores": [{"hole_number": 1}], "date": "not-a-date"},
        {"hole_scores": [{"hole_number": 1}], "course_id": "bad"},
        {"hole_scores": [{"hole_number": 1}], "all_tees": [{"color": "Blue", "hole_yardages": {"x": 100}}]},
        {"hole_scores": [{"hole_number": 1}], "all_tees": [{"color": "Blue", "hole_yardages": {"19": 100}}]},
        {"hole_scores": [{"hole_number": 1}], "all_tees": [{"color": "Blue", "hole_yardages": {"1": 49}}]},
    ],
)
def test_request_schema_rejections(payload):
    with pytest.raises(ValidationError):
        SaveRoundRequest.model_validate(payload)


def test_auth_environment_helpers_and_invalid_tokens(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(EnvironmentError):
        auth_utils.get_secret_key()

    monkeypatch.setenv("SECRET_KEY", "s" * 32)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "bad")
    monkeypatch.setenv("EMAIL_VERIFICATION_TTL_MINUTES", "1")
    monkeypatch.setenv("PASSWORD_RESET_TTL_MINUTES", "bad")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("AUTH_COOKIE_SAMESITE", "invalid")
    assert auth_utils.get_access_token_expiry_seconds() == 12 * 60 * 60
    assert auth_utils.get_email_verification_ttl_minutes() == 5
    assert auth_utils.get_password_reset_ttl_minutes() == 30
    assert auth_utils.get_cookie_secure_flag() is True
    assert auth_utils.get_cookie_samesite() == "none"
    assert auth_utils.verify_password("", "") is False
    assert auth_utils.verify_password("plain", "not-a-bcrypt-hash") is False
    assert auth_utils.decode_access_token("not-a-jwt") is None

    token = auth_utils.create_access_token("user-1")
    assert auth_utils.decode_access_token(token)["sub"] == "user-1"


def test_auth_cookie_configuration_variants(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("RAILWAY_ENVIRONMENT_ID", raising=False)
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "yes")
    monkeypatch.setenv("AUTH_COOKIE_SAMESITE", "strict")
    monkeypatch.setenv("ACCESS_TOKEN_COOKIE_NAME", "custom_cookie")
    assert auth_utils.get_cookie_secure_flag() is True
    assert auth_utils.get_cookie_samesite() == "strict"
    assert auth_utils.get_access_token_cookie_name() == "custom_cookie"
    assert auth_utils.get_jwt_issuer() == "scanscorecards-api"
    assert auth_utils.get_jwt_audience() == "scanscorecards-users"


def test_dependency_network_and_database_helpers(monkeypatch):
    monkeypatch.setenv("TRUST_PROXY_HEADERS", "true")
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "bad,10.0.0.0/8")
    trusted = make_http_request(headers=[(b"x-forwarded-for", b"203.0.113.4, 10.0.0.1")], client=("10.1.2.3", 1))
    assert dependencies.client_ip(trusted) == "203.0.113.4"
    assert dependencies._peer_is_trusted_proxy("not-an-ip") is False

    app = SimpleNamespace(state=SimpleNamespace(db_manager="db"))
    assert dependencies.get_db(make_http_request(app=app)) == "db"
    with pytest.raises(HTTPException) as exc:
        dependencies.get_db(make_http_request())
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_current_user_dependency_paths(monkeypatch):
    db = SimpleNamespace(users=SimpleNamespace(get_user=AsyncMock(return_value=User(id="u1"))))
    request = make_http_request(cookies="golf_access_token=cookie-token")
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {"sub": "u1"})
    user = await dependencies.get_current_user(request, None, db)
    assert user.id == "u1"

    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bearer-token")
    assert (await dependencies.get_optional_current_user(request, credentials, db)).id == "u1"

    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: None)
    with pytest.raises(HTTPException, match="Invalid or expired"):
        await dependencies.get_current_user(request, credentials, db)
    assert await dependencies.get_optional_current_user(request, credentials, db) is None

    no_token = make_http_request()
    with pytest.raises(HTTPException, match="Not authenticated"):
        await dependencies.get_current_user(no_token, None, db)
    assert await dependencies.get_optional_current_user(no_token, None, db) is None

    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {})
    assert await dependencies.get_optional_current_user(request, credentials, db) is None
    monkeypatch.setattr(dependencies, "decode_access_token", lambda token: {"sub": "missing"})
    db.users.get_user.return_value = None
    with pytest.raises(HTTPException, match="User not found"):
        await dependencies.get_current_user(request, credentials, db)


def test_deployment_security_and_host_parsing(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "s" * 32)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@db.internal:5432/app?sslmode=require")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DB_HOST_ALLOWLIST", "db.internal")
    security.validate_deployment_security()

    monkeypatch.setenv("ALLOWED_HOSTS", "api.example.com,api.example.com")
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com/path")
    monkeypatch.setenv("RAILWAY_STATIC_URL", "railway.example.com:443/path")
    monkeypatch.setenv("RAILWAY_PROJECT_ID", "project")
    hosts = security.parse_allowed_hosts()
    assert hosts.count("api.example.com") == 1
    assert "app.example.com" in hosts
    assert "railway.example.com" in hosts
    assert "healthcheck.railway.app" in hosts
    assert "*.railway.app" not in hosts


def test_https_detection_and_redirects(monkeypatch):
    monkeypatch.setenv("ENFORCE_HTTPS", "true")
    monkeypatch.setenv("ALLOW_LOCAL_HTTP", "false")
    forwarded = make_http_request(headers=[(b"x-forwarded-proto", b"https, http")])
    assert security.is_https_request(forwarded) is True
    assert security.enforce_https_if_needed(forwarded) is None
    assert security.enforce_https_if_needed(make_http_request("/api/health")) is None

    request = make_http_request("/api/users")
    redirect = security.enforce_https_if_needed(request)
    assert redirect.status_code == 307
    assert str(redirect.headers["location"]).startswith("https://")

    monkeypatch.setenv("ALLOW_LOCAL_HTTP", "true")
    assert security.should_allow_insecure_local_request(request) is True
    assert security.enforce_https_if_needed(request) is None


def test_security_traffic_monitor_logs_error_warning_and_alerts(monkeypatch, caplog):
    clock = iter([100.0, 101.0, 120.0, 140.0])
    monkeypatch.setattr(security.time, "time", lambda: next(clock))
    monitor = security.SecurityTrafficMonitor(
        request_window_sec=10,
        auth_window_sec=30,
        request_threshold=20,
        auth_failure_threshold=5,
        alert_cooldown_sec=10,
    )
    monitor._request_threshold = 2
    monitor._auth_failure_threshold = 2
    monitor.record(ip="1", status_code=500, method="GET", path="/api/x", latency_ms=1, user_agent="ua")
    monitor.record(ip="1", status_code=401, method="POST", path="/api/auth/login", latency_ms=2, user_agent="ua")
    monitor.record(ip="2", status_code=403, method="POST", path="/api/auth/login", latency_ms=2, user_agent="ua")
    monitor.record(ip="2", status_code=429, method="POST", path="/api/auth/login", latency_ms=2, user_agent="ua")
    assert "API error response" in caplog.text
    assert "Unusual traffic volume" in caplog.text
    assert "Potential brute-force" in caplog.text


def test_app_root_health_headers_and_global_rate_limit(monkeypatch):
    monkeypatch.setenv("API_RATE_LIMIT_MAX_REQUESTS", "1")
    monkeypatch.setenv("API_RATE_LIMIT_MAX_UNAUTH_REQUESTS", "10")
    app = api_main.create_app()
    client = TestClient(app, base_url="http://localhost")

    root = client.get("/", headers={"user-agent": "browser"})
    assert root.json() == {"status": "ok", "service": "backend"}
    assert root.headers["x-content-type-options"] == "nosniff"
    assert client.head("/").status_code == 200

    health = client.get("/api/health", headers={"user-agent": "browser"})
    assert health.json() == {"status": "degraded", "database": False}
    first = client.get("/api/not-found", headers={"user-agent": "browser"})
    second = client.get("/api/not-found", headers={"user-agent": "browser"})
    assert first.status_code == 404
    assert second.status_code == 429
    assert second.json()["detail"] == "Too many requests. Please slow down."


@pytest.mark.asyncio
async def test_lifespan_initializes_and_closes_database(monkeypatch):
    app = api_main.FastAPI()
    monkeypatch.setattr(api_main, "validate_deployment_security", MagicMock())
    monkeypatch.setattr(api_main.db, "initialize", AsyncMock())
    monkeypatch.setattr(api_main.db, "close", AsyncMock())
    monkeypatch.setattr(api_main.db, "_pool", MagicMock())

    async with api_main.lifespan(app):
        assert app.state.db_manager is not None
        assert app.state.db_connect_error is None

    api_main.db.initialize.assert_awaited_once()
    api_main.db.close.assert_awaited_once()
