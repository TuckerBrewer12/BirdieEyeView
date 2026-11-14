import pytest

import api.auth_utils as auth_utils


def test_secret_key_is_required(monkeypatch):
    monkeypatch.delenv("SECRET_KEY", raising=False)

    with pytest.raises(EnvironmentError):
        auth_utils.get_secret_key()


@pytest.mark.parametrize(
    ("environment_name", "configured_value", "expected"),
    [
        ("ACCESS_TOKEN_EXPIRE_MINUTES", "bad", 12 * 60 * 60),
        ("EMAIL_VERIFICATION_TTL_MINUTES", "1", 5),
        ("PASSWORD_RESET_TTL_MINUTES", "bad", 30),
    ],
)
def test_duration_configuration_uses_safe_defaults(monkeypatch, environment_name, configured_value, expected):
    getters = {
        "ACCESS_TOKEN_EXPIRE_MINUTES": auth_utils.get_access_token_expiry_seconds,
        "EMAIL_VERIFICATION_TTL_MINUTES": auth_utils.get_email_verification_ttl_minutes,
        "PASSWORD_RESET_TTL_MINUTES": auth_utils.get_password_reset_ttl_minutes,
    }
    monkeypatch.setenv(environment_name, configured_value)

    assert getters[environment_name]() == expected


def test_production_cookies_default_to_secure_and_cross_site(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("AUTH_COOKIE_SECURE", raising=False)
    monkeypatch.delenv("AUTH_COOKIE_SAMESITE", raising=False)

    assert auth_utils.get_cookie_secure_flag() is True
    assert auth_utils.get_cookie_samesite() == "none"


def test_invalid_cookie_samesite_uses_environment_default(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("AUTH_COOKIE_SAMESITE", "invalid")

    assert auth_utils.get_cookie_samesite() == "none"


def test_explicit_cookie_configuration_is_used(monkeypatch):
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("RAILWAY_ENVIRONMENT_ID", raising=False)
    monkeypatch.setenv("AUTH_COOKIE_SECURE", "yes")
    monkeypatch.setenv("AUTH_COOKIE_SAMESITE", "strict")

    assert auth_utils.get_cookie_secure_flag() is True
    assert auth_utils.get_cookie_samesite() == "strict"


def test_auth_identifier_configuration_defaults_and_override(monkeypatch):
    monkeypatch.setenv("ACCESS_TOKEN_COOKIE_NAME", "custom_cookie")

    assert auth_utils.get_access_token_cookie_name() == "custom_cookie"
    assert (auth_utils.get_jwt_issuer(), auth_utils.get_jwt_audience()) == (
        "scanscorecards-api",
        "scanscorecards-users",
    )


@pytest.mark.parametrize(
    ("plain", "hashed"),
    [("", ""), ("plain", "not-a-bcrypt-hash")],
)
def test_password_verification_rejects_unusable_values(plain, hashed):
    assert auth_utils.verify_password(plain, hashed) is False


def test_malformed_access_token_is_rejected(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "s" * 32)

    assert auth_utils.decode_access_token("not-a-jwt") is None
