"""Google Identity Services ID token verification."""

import os
from dataclasses import dataclass

from fastapi import HTTPException

from api.error_responses import SERVICE_UNAVAILABLE
from api.messages import INVALID_GOOGLE_TOKEN
from api.provider_tokens import JwksCache, ProviderTokenError, ProviderUnavailableError, verify_id_token

GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")
GOOGLE_KEYS = JwksCache("https://www.googleapis.com/oauth2/v3/certs")


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    email_verified: bool
    name: str
    hosted_domain: str | None = None


def get_google_oauth_client_ids() -> list[str]:
    configured = os.environ.get("GOOGLE_OAUTH_CLIENT_IDS", "")
    client_ids = [value.strip() for value in configured.split(",") if value.strip()]
    client_ids.extend(
        value.strip()
        for value in (
            os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""),
            os.environ.get("GOOGLE_WEB_CLIENT_ID", ""),
            os.environ.get("GOOGLE_IOS_CLIENT_ID", ""),
            os.environ.get("GOOGLE_ANDROID_CLIENT_ID", ""),
        )
        if value.strip()
    )
    return list(dict.fromkeys(client_ids))


def is_authoritative_google_email(identity: GoogleIdentity) -> bool:
    """Whether Google owns the email: a Gmail address, or a Workspace account (``hd`` claim)."""
    if identity.email.endswith("@gmail.com") or identity.email.endswith("@googlemail.com"):
        return identity.email_verified
    return identity.email_verified and bool(identity.hosted_domain)


async def verify_google_credential(credential: str) -> GoogleIdentity:
    client_ids = get_google_oauth_client_ids()
    if not client_ids:
        raise HTTPException(500, SERVICE_UNAVAILABLE)

    try:
        payload = await verify_id_token(credential, keys=GOOGLE_KEYS, audiences=client_ids, issuers=GOOGLE_ISSUERS)
    except ProviderUnavailableError as exc:
        raise HTTPException(503, SERVICE_UNAVAILABLE) from exc
    except ProviderTokenError as exc:
        raise HTTPException(401, INVALID_GOOGLE_TOKEN) from exc

    subject = str(payload["sub"]).strip()
    email = str(payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(401, INVALID_GOOGLE_TOKEN)

    name = str(payload.get("name") or payload.get("given_name") or email.split("@")[0]).strip()
    hosted_domain = str(payload.get("hd") or "").strip() or None

    return GoogleIdentity(
        subject=subject,
        email=email,
        email_verified=payload.get("email_verified") is True,
        name=name[:100] or email.split("@")[0],
        hosted_domain=hosted_domain,
    )
