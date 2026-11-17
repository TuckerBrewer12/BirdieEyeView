import hashlib
import os

from fastapi import HTTPException, Request, Response

from api.auth_utils import get_access_token_cookie_name, get_access_token_expiry_seconds, get_cookie_samesite, get_cookie_secure_flag
from api.security import SlidingWindowRateLimiter


def email_fingerprint(email: str) -> str:
    return hashlib.sha256(email.encode("utf-8")).hexdigest()[:12]


def check_rate_limit(limiter: SlidingWindowRateLimiter, key: str, limit: int, window_seconds: int, detail: str) -> None:
    allowed, retry_after = limiter.check(key, limit=max(1, limit), window_seconds=max(1, window_seconds))
    if not allowed:
        raise HTTPException(status_code=429, detail=detail, headers={"Retry-After": str(retry_after)})


def _link(request: Request, url_env: str, frontend_path: str, fallback_path: str, token: str) -> str:
    configured = os.environ.get(url_env)
    if configured:
        return f"{configured.rstrip('/')}?token={token}"
    frontend_base = os.environ.get("FRONTEND_URL")
    if frontend_base:
        return f"{frontend_base.rstrip('/')}/{frontend_path}?token={token}"
    return f"{request.base_url}{fallback_path}?token={token}"


def verification_link(request: Request, token: str) -> str:
    return _link(request, "AUTH_VERIFY_URL_BASE", "verify-email", "api/auth/verify-email", token)


def password_reset_link(request: Request, token: str) -> str:
    return _link(request, "AUTH_PASSWORD_RESET_URL_BASE", "reset-password", "reset-password", token)


def _cookie_flags() -> tuple[bool, str]:
    samesite = get_cookie_samesite()
    return get_cookie_secure_flag() or samesite == "none", samesite


def set_auth_cookie(response: Response, token: str) -> None:
    secure, samesite = _cookie_flags()
    response.set_cookie(
        key=get_access_token_cookie_name(),
        value=token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=get_access_token_expiry_seconds(),
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    secure, samesite = _cookie_flags()
    response.delete_cookie(key=get_access_token_cookie_name(), path="/", secure=secure, samesite=samesite)
