"""Google Identity Services token verification."""

import os
from dataclasses import dataclass
from fastapi import HTTPException


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
    if identity.email.endswith("@gmail.com") or identity.email.endswith("@googlemail.com"):
        return identity.email_verified
    return identity.email_verified and bool(identity.hosted_domain)


def verify_google_credential(credential: str) -> GoogleIdentity:
    client_ids = get_google_oauth_client_ids()
    if not client_ids:
        raise HTTPException(500, "Google sign-in is not configured")

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError as exc:
        raise HTTPException(500, "Google sign-in dependency is not installed") from exc

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_ids,
        )
    except ValueError as exc:
        raise HTTPException(401, "Invalid Google sign-in token") from exc

    issuer = payload.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(401, "Invalid Google sign-in token")

    subject = str(payload.get("sub") or "").strip()
    email = str(payload.get("email") or "").strip().lower()
    if not subject or not email:
        raise HTTPException(401, "Invalid Google sign-in token")

    email_verified = bool(payload.get("email_verified"))
    if not email_verified:
        raise HTTPException(403, "Google account email is not verified")

    name = str(payload.get("name") or payload.get("given_name") or email.split("@")[0]).strip()
    hosted_domain = str(payload.get("hd") or "").strip() or None

    return GoogleIdentity(
        subject=subject,
        email=email,
        email_verified=email_verified,
        name=name[:100] or email.split("@")[0],
        hosted_domain=hosted_domain,
    )
