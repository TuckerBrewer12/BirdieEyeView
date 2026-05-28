"""Sign in with Apple identity token verification."""

import os
import time
from dataclasses import dataclass
from typing import Any

import requests
from fastapi import HTTPException
from jose import jwk, jwt
from jose.exceptions import JOSEError, JWTError

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
_APPLE_KEYS_CACHE: tuple[float, list[dict[str, Any]]] | None = None
_APPLE_KEYS_TTL_SECONDS = 3600


@dataclass(frozen=True)
class AppleIdentity:
    subject: str
    email: str | None
    email_verified: bool
    name: str | None = None


def get_apple_client_ids() -> list[str]:
    configured = os.environ.get("APPLE_CLIENT_IDS", "")
    client_ids = [value.strip() for value in configured.split(",") if value.strip()]
    client_ids.extend(
        value.strip()
        for value in (
            os.environ.get("APPLE_CLIENT_ID", ""),
            os.environ.get("APPLE_SERVICE_ID", ""),
            os.environ.get("APPLE_BUNDLE_ID", ""),
        )
        if value.strip()
    )
    return list(dict.fromkeys(client_ids))


def _get_apple_keys() -> list[dict[str, Any]]:
    global _APPLE_KEYS_CACHE
    now = time.time()
    if _APPLE_KEYS_CACHE and now - _APPLE_KEYS_CACHE[0] < _APPLE_KEYS_TTL_SECONDS:
        return _APPLE_KEYS_CACHE[1]

    response = requests.get(APPLE_KEYS_URL, timeout=10)
    response.raise_for_status()
    keys = response.json().get("keys", [])
    if not isinstance(keys, list):
        raise HTTPException(401, "Invalid Apple sign-in token")
    _APPLE_KEYS_CACHE = (now, keys)
    return keys


def _parse_email_verified(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == "true"
    return False


def verify_apple_identity_token(identity_token: str, name: str | None = None) -> AppleIdentity:
    client_ids = get_apple_client_ids()
    if not client_ids:
        raise HTTPException(500, "Apple sign-in is not configured")

    try:
        header = jwt.get_unverified_header(identity_token)
    except JWTError as exc:
        raise HTTPException(401, "Invalid Apple sign-in token") from exc

    key_id = header.get("kid")
    algorithm = header.get("alg")
    key_data = next((key for key in _get_apple_keys() if key.get("kid") == key_id), None)
    if not key_data or algorithm != "RS256":
        raise HTTPException(401, "Invalid Apple sign-in token")

    try:
        public_key = jwk.construct(key_data, algorithm).to_pem()
        payload = jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=client_ids,
            issuer=APPLE_ISSUER,
        )
    except (JOSEError, JWTError) as exc:
        raise HTTPException(401, "Invalid Apple sign-in token") from exc

    subject = str(payload.get("sub") or "").strip()
    if not subject:
        raise HTTPException(401, "Invalid Apple sign-in token")

    email = str(payload.get("email") or "").strip().lower() or None
    email_verified = _parse_email_verified(payload.get("email_verified"))
    cleaned_name = (name or "").strip()[:100] or None

    return AppleIdentity(
        subject=subject,
        email=email,
        email_verified=email_verified,
        name=cleaned_name,
    )
