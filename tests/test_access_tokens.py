import base64
import json
import warnings
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from api import auth_utils
from api.auth_utils import create_access_token, decode_access_token

SECRET = "access-token-test-secret-long-enough-for-hs512-" + "x" * 20
ISSUER = "scanscorecards-api"
AUDIENCE = "scanscorecards-users"

GOLDEN_SECRET = "golden-secret-key-at-least-32-characters-long"
GOLDEN_JOSE_TOKEN = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJzdWIiOiIwYjdjNGYxZS0zZDJhLTRjNWItOWU4Zi0xYTJiM2M0ZDVlNmYiLCJleHAiOjQxMDI0NDQ4MDAsImlhdCI6MTc2Mj"
    "AwMDAwMCwiaXNzIjoic2NhbnNjb3JlY2FyZHMtYXBpIiwiYXVkIjoic2NhbnNjb3JlY2FyZHMtdXNlcnMiLCJqdGkiOiI1ZjBj"
    "MmE4ZS03ZDQxLTRiOWEtYTNjNi0yZThmOWQxYjdjNDAifQ."
    "ki7E0R14b9jUUEjY4Xn4I1vgjmhKRGYi0PS4GcBpILU"
)


@pytest.fixture(autouse=True)
def token_env(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", SECRET)
    monkeypatch.delenv("JWT_ISSUER", raising=False)
    monkeypatch.delenv("JWT_AUDIENCE", raising=False)
    monkeypatch.setenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")


def claims(**overrides):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "user-123",
        "exp": now + timedelta(minutes=5),
        "iat": now,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "jti": "jti-1",
    }
    payload.update(overrides)
    return {k: v for k, v in payload.items() if v is not None}


def sign(payload, key=SECRET, algorithm="HS256"):
    return jwt.encode(payload, key, algorithm=algorithm)


def b64(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()


def as_wire(payload: dict) -> dict:
    return {k: int(v.timestamp()) if isinstance(v, datetime) else v for k, v in payload.items()}


def test_a_minted_token_round_trips_with_whole_second_times():
    token = create_access_token("user-123").token
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == "user-123"
    assert (payload["iss"], payload["aud"]) == (ISSUER, AUDIENCE)
    assert isinstance(payload["exp"], int) and isinstance(payload["iat"], int)
    assert payload["exp"] - payload["iat"] == 30 * 60
    assert jwt.get_unverified_header(token) == {"alg": "HS256", "typ": "JWT"}


def test_each_token_gets_its_own_jti():
    first = create_access_token("user-123")
    second = create_access_token("user-123")

    assert decode_access_token(first.token)["jti"] == first.jti
    assert first.jti != second.jti


def test_a_token_minted_by_python_jose_still_verifies(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", GOLDEN_SECRET)

    assert decode_access_token(GOLDEN_JOSE_TOKEN) == {
        "sub": "0b7c4f1e-3d2a-4c5b-9e8f-1a2b3c4d5e6f",
        "exp": 4102444800,
        "iat": 1762000000,
        "iss": ISSUER,
        "aud": AUDIENCE,
        "jti": "5f0c2a8e-7d41-4b9a-a3c6-2e8f9d1b7c40",
    }


def test_a_correct_secret_raises_no_short_key_warning():
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        assert decode_access_token(create_access_token("user-123").token) is not None


def test_a_token_signed_with_another_secret_is_refused():
    assert decode_access_token(sign(claims(), key="another-secret-that-is-32-bytes-long")) is None


def test_an_expired_token_is_refused():
    past = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert decode_access_token(sign(claims(exp=past, iat=past - timedelta(hours=1)))) is None


@pytest.mark.parametrize(("claim", "value"), [("aud", "someone-else"), ("iss", "someone-else")])
def test_a_token_for_another_audience_or_issuer_is_refused(claim, value):
    assert decode_access_token(sign(claims(**{claim: value}))) is None


@pytest.mark.parametrize("claim", auth_utils.REQUIRED_CLAIMS)
def test_a_token_missing_a_required_claim_is_refused(claim):
    assert decode_access_token(sign(claims(**{claim: None}))) is None


def test_a_subject_that_is_not_a_string_is_refused():
    assert decode_access_token(sign(claims(sub=123))) is None


@pytest.mark.parametrize("algorithm", ["HS384", "HS512"])
def test_only_hs256_is_accepted_even_with_the_right_secret(algorithm):
    assert decode_access_token(sign(claims(), algorithm=algorithm)) is None


def test_an_unsigned_alg_none_token_is_refused():
    token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64(as_wire(claims()))}."

    assert decode_access_token(token) is None


def test_an_rs256_header_on_an_hmac_body_is_refused():
    _, body, signature = sign(claims()).split(".")

    assert decode_access_token(f"{b64({'alg': 'RS256', 'typ': 'JWT'})}.{body}.{signature}") is None


def test_a_tampered_payload_is_refused():
    header, _, signature = sign(claims()).split(".")
    forged = as_wire(claims(sub="someone-else"))

    assert decode_access_token(f"{header}.{b64(forged)}.{signature}") is None


@pytest.mark.parametrize("token", ["", "a.b", "a.b.c", "not-a-jwt", "Bearer x.y.z"])
def test_garbage_is_refused(token):
    assert decode_access_token(token) is None
