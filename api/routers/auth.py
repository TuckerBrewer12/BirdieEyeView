"""Authentication endpoints: register/login/logout/me + verification/reset flows."""

import hashlib
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from api.messages import (
    ACCOUNT_CREATED, EMAIL_ALREADY_REGISTERED, EMAIL_NOT_VERIFIED, EMAIL_VERIFIED, HOME_COURSE_NOT_FOUND,
    INVALID_CREDENTIALS, INVALID_RESET_TOKEN, INVALID_VERIFICATION_TOKEN, LOGGED_OUT, PASSWORD_RESET_COMPLETE,
    RESET_LINK_SENT_IF_ACCOUNT_EXISTS, TOO_MANY_LOGIN_ATTEMPTS, TOO_MANY_LOGIN_REQUESTS, TOO_MANY_RESET_ATTEMPTS,
    TOO_MANY_SIGNUPS, TOO_MANY_SIGNUPS_FOR_EMAIL, TOO_MANY_VERIFICATION_RESENDS,
    TOO_MANY_VERIFICATION_RESENDS_FOR_EMAIL, VERIFICATION_SENT_IF_ACCOUNT_EXISTS,
)
from api.messages import (
    APPLE_ACCOUNT_LINKED_ELSEWHERE, APPLE_EMAIL_MISSING, APPLE_EMAIL_NOT_VERIFIED, GOOGLE_ACCOUNT_LINKED_ELSEWHERE,
    GOOGLE_EMAIL_NOT_VERIFIED, INVALID_APPLE_TOKEN, PROVIDER_EMAIL_NEEDS_PASSWORD_SIGN_IN, TOO_MANY_APPLE_NONCE_REQUESTS,
    TOO_MANY_APPLE_SIGN_INS, TOO_MANY_GOOGLE_SIGN_INS,
)
from api.auth_notifications import send_password_reset_email, send_verification_email
from api.course_access import load_linkable_course
from api.auth_schemas import (
    AppleAuthRequest,
    AppleNonceResponse,
    AuthUserResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from api.auth_utils import (
    create_access_token,
    generate_one_time_token,
    get_access_token_cookie_name,
    get_access_token_expiry_seconds,
    get_cookie_samesite,
    get_cookie_secure_flag,
    get_email_verification_ttl_minutes,
    get_password_reset_ttl_minutes,
    hash_one_time_token,
    hash_password,
    verify_password,
)
from api.apple_identity import verify_apple_identity_token
from api.dependencies import client_ip, get_current_user, get_db
from api.google_identity import is_authoritative_google_email, verify_google_credential
from api.login_rate_limiter import InMemoryLoginRateLimiter
from api.security import SlidingWindowRateLimiter
from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


login_rate_limiter = InMemoryLoginRateLimiter(
    max_attempts=max(_env_int("LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 5), 1),
    window_seconds=max(_env_int("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 15 * 60), 30),
    lock_seconds=max(_env_int("LOGIN_RATE_LIMIT_LOCK_SECONDS", 15 * 60), 30),
)
register_rate_limiter = SlidingWindowRateLimiter()
auth_request_rate_limiter = SlidingWindowRateLimiter()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _email_fingerprint(email: str) -> str:
    normalized = _normalize_email(email)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:12]


def _check_auth_rate_limit(
    *,
    limiter: SlidingWindowRateLimiter,
    key: str,
    limit: int,
    window_seconds: int,
    detail: str,
) -> int:
    allowed, retry_after = limiter.check(
        key,
        limit=max(1, limit),
        window_seconds=max(1, window_seconds),
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=detail,
            headers={"Retry-After": str(retry_after)},
        )
    return retry_after


def _build_verification_url(request: Request, token: str) -> str:
    configured = os.environ.get("AUTH_VERIFY_URL_BASE")
    if configured:
        return f"{configured.rstrip('/')}?token={token}"
    frontend_base = os.environ.get("FRONTEND_URL")
    if frontend_base:
        return f"{frontend_base.rstrip('/')}/verify-email?token={token}"
    return f"{request.base_url}api/auth/verify-email?token={token}"


def _build_password_reset_url(request: Request, token: str) -> str:
    configured = os.environ.get("AUTH_PASSWORD_RESET_URL_BASE")
    if configured:
        return f"{configured.rstrip('/')}?token={token}"
    frontend_base = os.environ.get("FRONTEND_URL")
    if frontend_base:
        return f"{frontend_base.rstrip('/')}/reset-password?token={token}"
    return f"{request.base_url}reset-password?token={token}"


def _set_auth_cookie(response: Response, token: str) -> None:
    samesite = get_cookie_samesite()
    secure = get_cookie_secure_flag() or samesite == "none"
    response.set_cookie(
        key=get_access_token_cookie_name(),
        value=token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=get_access_token_expiry_seconds(),
        path="/",
    )


def _clear_auth_cookie(response: Response) -> None:
    samesite = get_cookie_samesite()
    secure = get_cookie_secure_flag() or samesite == "none"
    response.delete_cookie(
        key=get_access_token_cookie_name(),
        path="/",
        secure=secure,
        samesite=samesite,
    )


async def _issue_verification_token(db: DatabaseManager, user: User, request: Request) -> None:
    raw_token = generate_one_time_token()
    token_hash = hash_one_time_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=get_email_verification_ttl_minutes())
    await db.users.create_auth_token(
        user_id=str(user.id),
        token_type="email_verify",
        token_hash=token_hash,
        expires_at=expires_at,
    )
    verify_url = _build_verification_url(request, raw_token)
    try:
        send_verification_email(user.email or "", verify_url)
    except Exception:  # noqa: BLE001
        logger.exception(
            "Auth verification email send failed: user_id=%s email_fp=%s",
            user.id,
            _email_fingerprint(user.email or ""),
        )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    normalized_email = _normalize_email(req.email)
    request_ip = client_ip(request)
    _check_auth_rate_limit(
        limiter=register_rate_limiter,
        key=f"register:ip:{request_ip}",
        limit=_env_int("REGISTER_RATE_LIMIT_MAX_ATTEMPTS", 5),
        window_seconds=_env_int("REGISTER_RATE_LIMIT_WINDOW_SECONDS", 3600),
        detail=TOO_MANY_SIGNUPS,
    )
    _check_auth_rate_limit(
        limiter=register_rate_limiter,
        key=f"register:email:{_email_fingerprint(normalized_email)}",
        limit=_env_int("REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS", 3),
        window_seconds=_env_int("REGISTER_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS", 3600),
        detail=TOO_MANY_SIGNUPS_FOR_EMAIL,
    )
    existing = await db.users.get_user_by_email(normalized_email)
    if existing:
        logger.warning(
            "Auth register rejected (duplicate): email_fp=%s ip=%s",
            _email_fingerprint(normalized_email),
            request_ip,
        )
        raise HTTPException(409, EMAIL_ALREADY_REGISTERED)

    if req.home_course_id:
        # A new account owns no courses yet, so only a master course can be its home course.
        await load_linkable_course(db, req.home_course_id, None, missing_detail=HOME_COURSE_NOT_FOUND)

    password_hash = hash_password(req.password)
    try:
        user = await db.users.create_user(
            User(
                name=req.name,
                email=normalized_email,
                handicap=req.handicap,
                home_course_id=req.home_course_id,
                email_verified=False,
            ),
            password_hash=password_hash,
        )
    except DuplicateError:
        raise HTTPException(409, EMAIL_ALREADY_REGISTERED)

    await _issue_verification_token(db, user, request)
    logger.info(
        "Auth register success: user_id=%s email_fp=%s ip=%s verification_required=true",
        user.id,
        _email_fingerprint(normalized_email),
        request_ip,
    )
    return RegisterResponse(
        message=ACCOUNT_CREATED,
        requires_email_verification=True,
    )


async def _verify_email_token(token: str, db: DatabaseManager) -> str:
    user_id = await db.users.consume_auth_token("email_verify", hash_one_time_token(token))
    if not user_id:
        logger.warning("Auth verify-email failed: reason=invalid_or_expired_token")
        raise HTTPException(400, INVALID_VERIFICATION_TOKEN)
    await db.users.mark_email_verified(user_id)
    logger.info("Auth verify-email success: user_id=%s", user_id)
    return user_id


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(req: VerifyEmailRequest, response: Response, db: DatabaseManager = Depends(get_db)):
    user_id = await _verify_email_token(req.token, db)
    _set_auth_cookie(response, create_access_token(user_id))
    return MessageResponse(message=EMAIL_VERIFIED)


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email_from_link(
    response: Response,
    token: str = Query(..., min_length=20, max_length=512),
    db: DatabaseManager = Depends(get_db),
):
    user_id = await _verify_email_token(token, db)
    _set_auth_cookie(response, create_access_token(user_id))
    return MessageResponse(message=EMAIL_VERIFIED)


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    req: ResendVerificationRequest,
    request: Request,
    db: DatabaseManager = Depends(get_db),
):
    normalized_email = _normalize_email(req.email)
    request_ip = client_ip(request)
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"resend:req:ip:{request_ip}",
        limit=_env_int("RESEND_VERIFICATION_RATE_LIMIT_MAX_ATTEMPTS", 10),
        window_seconds=_env_int("RESEND_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS", 300),
        detail=TOO_MANY_VERIFICATION_RESENDS,
    )
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"resend:req:email:{_email_fingerprint(normalized_email)}",
        limit=_env_int("RESEND_VERIFICATION_RATE_LIMIT_PER_EMAIL_ATTEMPTS", 5),
        window_seconds=_env_int("RESEND_VERIFICATION_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS", 300),
        detail=TOO_MANY_VERIFICATION_RESENDS_FOR_EMAIL,
    )
    user = await db.users.get_user_by_email(normalized_email)
    if user and not user.email_verified:
        cooldown_floor = datetime.now(timezone.utc) - timedelta(seconds=60)
        has_recent = await db.users.has_recent_auth_token(
            user_id=str(user.id),
            token_type="email_verify",
            min_created_at=cooldown_floor,
        )
        if not has_recent:
            await _issue_verification_token(db, user, request)
            logger.info(
                "Auth resend-verification success: user_id=%s email_fp=%s ip=%s",
                user.id,
                _email_fingerprint(normalized_email),
                request_ip,
            )
        else:
            logger.warning(
                "Auth resend-verification throttled: user_id=%s email_fp=%s ip=%s",
                user.id,
                _email_fingerprint(normalized_email),
                request_ip,
            )
    else:
        logger.warning(
            "Auth resend-verification no-op: email_fp=%s ip=%s",
            _email_fingerprint(normalized_email),
            request_ip,
        )
    return MessageResponse(message=VERIFICATION_SENT_IF_ACCOUNT_EXISTS)


@router.post("/login", response_model=AuthUserResponse)
async def login(
    req: LoginRequest,
    request: Request,
    response: Response,
    db: DatabaseManager = Depends(get_db),
):
    normalized_email = _normalize_email(req.email)
    request_ip = client_ip(request)
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"login:req:ip:{request_ip}",
        limit=_env_int("LOGIN_REQUEST_RATE_LIMIT_MAX_ATTEMPTS", 30),
        window_seconds=_env_int("LOGIN_REQUEST_RATE_LIMIT_WINDOW_SECONDS", 60),
        detail=TOO_MANY_LOGIN_REQUESTS,
    )

    ip_key = f"ip:{request_ip}"
    email_key = f"email:{normalized_email}"
    retry_after = max(
        login_rate_limiter.retry_after(ip_key) or 0,
        login_rate_limiter.retry_after(email_key) or 0,
    )
    if retry_after > 0:
        logger.warning(
            "Auth login rate-limited: email_fp=%s ip=%s retry_after=%s",
            _email_fingerprint(normalized_email),
            request_ip,
            retry_after,
        )
        raise HTTPException(
            status_code=429,
            detail=TOO_MANY_LOGIN_ATTEMPTS,
            headers={"Retry-After": str(retry_after)},
        )

    auth_user = await db.users.get_auth_user_by_email(normalized_email)
    pw_hash = auth_user["password_hash"] if auth_user else None
    valid_password = verify_password(req.password, pw_hash) if pw_hash else False
    if not auth_user or not valid_password:
        login_rate_limiter.register_failure(ip_key)
        login_rate_limiter.register_failure(email_key)
        logger.warning(
            "Auth login failed: email_fp=%s ip=%s reason=invalid_credentials",
            _email_fingerprint(normalized_email),
            request_ip,
        )
        raise HTTPException(401, INVALID_CREDENTIALS)

    if not auth_user["email_verified"]:
        logger.warning(
            "Auth login failed: user_id=%s email_fp=%s ip=%s reason=email_unverified",
            auth_user["id"],
            _email_fingerprint(normalized_email),
            request_ip,
        )
        raise HTTPException(403, EMAIL_NOT_VERIFIED)

    login_rate_limiter.register_success(ip_key)
    login_rate_limiter.register_success(email_key)

    token = create_access_token(auth_user["id"])
    _set_auth_cookie(response, token)
    logger.info(
        "Auth login success: user_id=%s email_fp=%s ip=%s",
        auth_user["id"],
        _email_fingerprint(normalized_email),
        request_ip,
    )
    return AuthUserResponse(
        user_id=auth_user["id"],
        name=auth_user["name"] or "",
        email=auth_user["email"] or "",
        email_verified=True,
        access_token=token,
    )


APPLE_NONCE_TTL_SECONDS = 600


@dataclass(frozen=True)
class _ProviderSignIn:
    """A verified provider identity, reduced to what the shared sign-in flow needs."""

    provider: str  # "google" or "apple"
    subject: str
    email: str | None
    email_verified: bool
    email_trusted: bool  # the provider owns the address, so it may claim an existing account
    name: str


_PROVIDER_REPLIES = {
    "google": {"label": "Google", "unverified": GOOGLE_EMAIL_NOT_VERIFIED, "linked": GOOGLE_ACCOUNT_LINKED_ELSEWHERE},
    "apple": {"label": "Apple", "unverified": APPLE_EMAIL_NOT_VERIFIED, "linked": APPLE_ACCOUNT_LINKED_ELSEWHERE},
}


async def _find_or_create_provider_user(sign_in: _ProviderSignIn, request_ip: str, db: DatabaseManager) -> dict:
    """Return the account for a verified provider identity, linking or creating it on first sign-in."""
    replies = _PROVIDER_REPLIES[sign_in.provider]
    auth_user = await db.users.get_auth_user_by_identity(sign_in.provider, sign_in.subject)
    if auth_user:
        return auth_user

    if not sign_in.email:
        logger.warning("Auth %s rejected: ip=%s reason=missing_email", replies["label"], request_ip)
        raise HTTPException(400, APPLE_EMAIL_MISSING)
    email_fp = _email_fingerprint(sign_in.email)
    if not sign_in.email_verified:
        logger.warning("Auth %s rejected: email_fp=%s ip=%s reason=email_unverified", replies["label"], email_fp, request_ip)
        raise HTTPException(403, replies["unverified"])

    existing = await db.users.get_auth_user_by_email(sign_in.email)
    try:
        if existing is None:
            user = await db.users.create_user_with_identity(
                User(name=sign_in.name, email=sign_in.email, email_verified=True),
                provider=sign_in.provider,
                provider_user_id=sign_in.subject,
                provider_email=sign_in.email,
            )
            return {"id": str(user.id), "name": user.name or "", "email": user.email, "email_verified": True}
        if not sign_in.email_trusted:
            logger.warning(
                "Auth %s link rejected: user_id=%s email_fp=%s ip=%s reason=non_authoritative_email",
                replies["label"], existing["id"], email_fp, request_ip,
            )
            raise HTTPException(409, PROVIDER_EMAIL_NEEDS_PASSWORD_SIGN_IN)
        if not existing["email_verified"]:
            logger.warning(
                "Auth %s claimed unverified account: user_id=%s email_fp=%s ip=%s password_cleared=true",
                replies["label"], existing["id"], email_fp, request_ip,
            )
        return await db.users.link_identity_to_email_owner(
            existing["id"],
            provider=sign_in.provider,
            provider_user_id=sign_in.subject,
            provider_email=sign_in.email,
        )
    except DuplicateError:
        # A concurrent sign-in created the account, or this identity is linked to another user.
        logger.warning("Auth %s rejected: email_fp=%s ip=%s reason=duplicate", replies["label"], email_fp, request_ip)
        raise HTTPException(409, replies["linked"] if existing else EMAIL_ALREADY_REGISTERED)


async def _sign_in_with_provider(
    sign_in: _ProviderSignIn, request: Request, response: Response, db: DatabaseManager
) -> AuthUserResponse:
    """Find, link or create the account, then issue the same session as password login."""
    request_ip = client_ip(request)
    auth_user = await _find_or_create_provider_user(sign_in, request_ip, db)
    token = create_access_token(auth_user["id"])
    _set_auth_cookie(response, token)
    email = auth_user["email"] or sign_in.email or ""
    logger.info(
        "Auth %s success: user_id=%s email_fp=%s ip=%s",
        _PROVIDER_REPLIES[sign_in.provider]["label"], auth_user["id"], _email_fingerprint(email), request_ip,
    )
    return AuthUserResponse(
        user_id=auth_user["id"],
        name=auth_user["name"] or "",
        email=email,
        email_verified=True,
        access_token=token,
    )


@router.post("/google", response_model=AuthUserResponse)
async def google_login(
    req: GoogleAuthRequest,
    request: Request,
    response: Response,
    db: DatabaseManager = Depends(get_db),
):
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"google:req:ip:{client_ip(request)}",
        limit=_env_int("GOOGLE_LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 30),
        window_seconds=_env_int("GOOGLE_LOGIN_RATE_LIMIT_WINDOW_SECONDS", 60),
        detail=TOO_MANY_GOOGLE_SIGN_INS,
    )
    identity = await verify_google_credential(req.credential)
    sign_in = _ProviderSignIn(
        provider="google",
        subject=identity.subject,
        email=identity.email,
        email_verified=identity.email_verified,
        email_trusted=is_authoritative_google_email(identity),
        name=identity.name,
    )
    return await _sign_in_with_provider(sign_in, request, response, db)


@router.post("/apple/nonce", response_model=AppleNonceResponse)
async def apple_nonce(request: Request, db: DatabaseManager = Depends(get_db)):
    """Issue a one-time nonce for the client to pass to Apple; /apple accepts it once, within 10 minutes."""
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"apple:nonce:ip:{client_ip(request)}",
        limit=_env_int("APPLE_NONCE_RATE_LIMIT_MAX_ATTEMPTS", 30),
        window_seconds=_env_int("APPLE_NONCE_RATE_LIMIT_WINDOW_SECONDS", 60),
        detail=TOO_MANY_APPLE_NONCE_REQUESTS,
    )
    nonce = generate_one_time_token()
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=APPLE_NONCE_TTL_SECONDS)
    await db.users.create_auth_nonce("apple", hash_one_time_token(nonce), expires_at)
    return AppleNonceResponse(nonce=nonce, expires_in=APPLE_NONCE_TTL_SECONDS)


@router.post("/apple", response_model=AuthUserResponse)
async def apple_login(
    req: AppleAuthRequest,
    request: Request,
    response: Response,
    db: DatabaseManager = Depends(get_db),
):
    request_ip = client_ip(request)
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"apple:req:ip:{request_ip}",
        limit=_env_int("APPLE_LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 30),
        window_seconds=_env_int("APPLE_LOGIN_RATE_LIMIT_WINDOW_SECONDS", 60),
        detail=TOO_MANY_APPLE_SIGN_INS,
    )
    identity = await verify_apple_identity_token(req.identity_token, req.nonce, req.name)
    # Consume only after Apple's signature covers this nonce, so a forged token cannot burn it.
    if not await db.users.consume_auth_nonce("apple", hash_one_time_token(req.nonce)):
        logger.warning("Auth Apple rejected: ip=%s reason=nonce_unknown_expired_or_used", request_ip)
        raise HTTPException(401, INVALID_APPLE_TOKEN)
    sign_in = _ProviderSignIn(
        provider="apple",
        subject=identity.subject,
        email=identity.email,
        email_verified=identity.email_verified,
        email_trusted=identity.email_verified,
        name=identity.name or (identity.email or "").split("@")[0],
    )
    return await _sign_in_with_provider(sign_in, request, response, db)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response):
    _clear_auth_cookie(response)
    logger.info("Auth logout: ip=%s", client_ip(request))
    return MessageResponse(message=LOGGED_OUT)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: DatabaseManager = Depends(get_db),
):
    normalized_email = _normalize_email(req.email)
    request_ip = client_ip(request)
    _check_auth_rate_limit(
        limiter=auth_request_rate_limiter,
        key=f"forgot:req:ip:{request_ip}",
        limit=_env_int("FORGOT_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS", 10),
        window_seconds=_env_int("FORGOT_PASSWORD_RATE_LIMIT_WINDOW_SECONDS", 300),
        detail=TOO_MANY_RESET_ATTEMPTS,
    )
    user = await db.users.get_user_by_email(normalized_email)
    if user and user.email_verified:
        cooldown_floor = datetime.now(timezone.utc) - timedelta(seconds=60)
        has_recent = await db.users.has_recent_auth_token(
            user_id=str(user.id),
            token_type="password_reset",
            min_created_at=cooldown_floor,
        )
        if not has_recent:
            raw_token = generate_one_time_token()
            token_hash = hash_one_time_token(raw_token)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=get_password_reset_ttl_minutes())
            await db.users.create_auth_token(
                user_id=str(user.id),
                token_type="password_reset",
                token_hash=token_hash,
                expires_at=expires_at,
            )
            reset_url = _build_password_reset_url(request, raw_token)
            try:
                send_password_reset_email(user.email or "", reset_url)
            except Exception:  # noqa: BLE001
                logger.exception(
                    "Auth forgot-password email send failed: user_id=%s email_fp=%s ip=%s",
                    user.id,
                    _email_fingerprint(normalized_email),
                    request_ip,
                )
            logger.info(
                "Auth forgot-password success: user_id=%s email_fp=%s ip=%s",
                user.id,
                _email_fingerprint(normalized_email),
                request_ip,
            )
        else:
            logger.warning(
                "Auth forgot-password throttled: user_id=%s email_fp=%s ip=%s",
                user.id,
                _email_fingerprint(normalized_email),
                request_ip,
            )
    else:
        logger.warning(
            "Auth forgot-password no-op: email_fp=%s ip=%s",
            _email_fingerprint(normalized_email),
            request_ip,
        )

    # Always generic to avoid account enumeration.
    return MessageResponse(message=RESET_LINK_SENT_IF_ACCOUNT_EXISTS)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    user_id = await db.users.consume_auth_token("password_reset", hash_one_time_token(req.token))
    if not user_id:
        logger.warning("Auth reset-password failed: ip=%s reason=invalid_or_expired_token", client_ip(request))
        raise HTTPException(400, INVALID_RESET_TOKEN)

    new_hash = hash_password(req.new_password)
    await db.users.set_password_hash(user_id, new_hash)
    logger.info("Auth reset-password success: user_id=%s ip=%s", user_id, client_ip(request))
    return MessageResponse(message=PASSWORD_RESET_COMPLETE)


@router.get("/me", response_model=AuthUserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return AuthUserResponse(
        user_id=str(current_user.id),
        name=current_user.name or "",
        email=current_user.email or "",
        email_verified=bool(current_user.email_verified),
    )
