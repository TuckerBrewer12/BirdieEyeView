"""Sign in with Apple identity token verification."""

import hmac
import os
from dataclasses import dataclass

from fastapi import HTTPException

from api.error_responses import SERVICE_UNAVAILABLE
from api.messages import INVALID_APPLE_TOKEN
from api.provider_tokens import JwksCache, ProviderTokenError, ProviderUnavailableError, verify_id_token

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_KEYS = JwksCache("https://appleid.apple.com/auth/keys")


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


def _parse_email_verified(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == "true"
    return False


async def verify_apple_identity_token(identity_token: str, nonce: str, name: str | None = None) -> AppleIdentity:
    """Verify the token and that Apple signed it for ``nonce``. The caller still consumes the nonce."""
    client_ids = get_apple_client_ids()
    if not client_ids:
        raise HTTPException(500, SERVICE_UNAVAILABLE)

    try:
        payload = await verify_id_token(identity_token, keys=APPLE_KEYS, audiences=client_ids, issuers=(APPLE_ISSUER,))
    except ProviderUnavailableError as exc:
        raise HTTPException(503, SERVICE_UNAVAILABLE) from exc
    except ProviderTokenError as exc:
        raise HTTPException(401, INVALID_APPLE_TOKEN) from exc

    token_nonce = payload.get("nonce")
    if not isinstance(token_nonce, str) or not hmac.compare_digest(token_nonce, nonce):
        raise HTTPException(401, INVALID_APPLE_TOKEN)

    email = str(payload.get("email") or "").strip().lower() or None
    cleaned_name = (name or "").strip()[:100] or None

    return AppleIdentity(
        subject=str(payload["sub"]).strip(),
        email=email,
        email_verified=_parse_email_verified(payload.get("email_verified")),
        name=cleaned_name,
    )
