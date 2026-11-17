import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials

from api.messages import (
    ACCOUNT_CREATED, EMAIL_ALREADY_REGISTERED, EMAIL_NOT_VERIFIED, EMAIL_VERIFIED, HOME_COURSE_NOT_FOUND,
    INVALID_CREDENTIALS, INVALID_RESET_TOKEN, INVALID_VERIFICATION_TOKEN, LOGGED_OUT, PASSWORD_RESET_COMPLETE,
    RESET_LINK_SENT_IF_ACCOUNT_EXISTS, TOO_MANY_LOGIN_ATTEMPTS, TOO_MANY_LOGIN_REQUESTS, TOO_MANY_RESET_ATTEMPTS,
    TOO_MANY_SIGNUPS, TOO_MANY_SIGNUPS_FOR_EMAIL, TOO_MANY_VERIFICATION_RESENDS,
    TOO_MANY_VERIFICATION_RESENDS_FOR_EMAIL, VERIFICATION_SENT_IF_ACCOUNT_EXISTS,
)
from api.auth_http import (
    check_rate_limit, clear_auth_cookie, email_fingerprint, password_reset_link, set_auth_cookie, verification_link,
)
from api.auth_notifications import send_password_reset_email, send_verification_email
from api.course_access import load_linkable_course
from api.auth_schemas import (
    AuthUserResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from api.auth_utils import (
    get_access_token_cookie_name,
    get_email_verification_ttl_minutes,
    get_password_reset_ttl_minutes,
    hash_password_async,
    verify_password_async,
)
from api.dependencies import bearer_scheme, client_ip, get_current_user, get_db, request_token
from api.login_rate_limiter import InMemoryLoginRateLimiter
from api.security import SlidingWindowRateLimiter, env_int
from database.db_manager import DatabaseManager
from database.exceptions import DuplicateError
from models import User
from services import auth_service

router = APIRouter()
logger = logging.getLogger(__name__)

RESEND_COOLDOWN = timedelta(seconds=60)

login_rate_limiter = InMemoryLoginRateLimiter(
    max_attempts=max(env_int("LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 5), 1),
    window_seconds=max(env_int("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 15 * 60), 30),
    lock_seconds=max(env_int("LOGIN_RATE_LIMIT_LOCK_SECONDS", 15 * 60), 30),
)
register_rate_limiter = SlidingWindowRateLimiter()
auth_request_rate_limiter = SlidingWindowRateLimiter()


async def _send_link_unless_recent(
    db: DatabaseManager, user: User, token_type: str, ttl_minutes: int, link_for, send
) -> bool:
    recent = await db.users.has_recent_auth_token(
        user_id=str(user.id), token_type=token_type, min_created_at=datetime.now(timezone.utc) - RESEND_COOLDOWN
    )
    if not recent:
        await auth_service.send_one_time_link(db, user, token_type, ttl_minutes, link_for, send)
    return not recent


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    request_ip = client_ip(request)
    check_rate_limit(
        register_rate_limiter, f"register:ip:{request_ip}",
        env_int("REGISTER_RATE_LIMIT_MAX_ATTEMPTS", 5), env_int("REGISTER_RATE_LIMIT_WINDOW_SECONDS", 3600),
        TOO_MANY_SIGNUPS,
    )
    check_rate_limit(
        register_rate_limiter, f"register:email:{email_fingerprint(req.email)}",
        env_int("REGISTER_RATE_LIMIT_PER_EMAIL_ATTEMPTS", 3),
        env_int("REGISTER_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS", 3600),
        TOO_MANY_SIGNUPS_FOR_EMAIL,
    )
    if await db.users.get_user_by_email(req.email):
        logger.warning("Auth register rejected (duplicate): email_fp=%s ip=%s", email_fingerprint(req.email), request_ip)
        raise HTTPException(409, EMAIL_ALREADY_REGISTERED)
    if req.home_course_id:
        await load_linkable_course(db, req.home_course_id, None, missing_detail=HOME_COURSE_NOT_FOUND)

    password_hash = await hash_password_async(req.password)
    try:
        user = await db.users.create_user(
            User(
                name=req.name,
                email=req.email,
                handicap=req.handicap,
                home_course_id=req.home_course_id,
                email_verified=False,
            ),
            password_hash=password_hash,
        )
    except DuplicateError:
        raise HTTPException(409, EMAIL_ALREADY_REGISTERED) from None

    await auth_service.send_one_time_link(
        db, user, "email_verify", get_email_verification_ttl_minutes(),
        lambda token: verification_link(request, token), send_verification_email,
    )
    logger.info("Auth register success: user_id=%s email_fp=%s ip=%s", user.id, email_fingerprint(req.email), request_ip)
    return RegisterResponse(message=ACCOUNT_CREATED, requires_email_verification=True)


async def _verify(token: str, db: DatabaseManager, response: Response) -> MessageResponse:
    verified = await auth_service.verify_email(db, token)
    if verified is None:
        logger.warning("Auth verify-email failed: reason=invalid_or_expired_token")
        raise HTTPException(400, INVALID_VERIFICATION_TOKEN)
    user_id, access_token = verified
    set_auth_cookie(response, access_token)
    logger.info("Auth verify-email success: user_id=%s", user_id)
    return MessageResponse(message=EMAIL_VERIFIED)


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(req: VerifyEmailRequest, response: Response, db: DatabaseManager = Depends(get_db)):
    return await _verify(req.token, db, response)


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email_from_link(
    response: Response,
    token: str = Query(..., min_length=20, max_length=512),
    db: DatabaseManager = Depends(get_db),
):
    return await _verify(token, db, response)


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(req: ResendVerificationRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    request_ip = client_ip(request)
    check_rate_limit(
        auth_request_rate_limiter, f"resend:req:ip:{request_ip}",
        env_int("RESEND_VERIFICATION_RATE_LIMIT_MAX_ATTEMPTS", 10),
        env_int("RESEND_VERIFICATION_RATE_LIMIT_WINDOW_SECONDS", 300),
        TOO_MANY_VERIFICATION_RESENDS,
    )
    check_rate_limit(
        auth_request_rate_limiter, f"resend:req:email:{email_fingerprint(req.email)}",
        env_int("RESEND_VERIFICATION_RATE_LIMIT_PER_EMAIL_ATTEMPTS", 5),
        env_int("RESEND_VERIFICATION_RATE_LIMIT_PER_EMAIL_WINDOW_SECONDS", 300),
        TOO_MANY_VERIFICATION_RESENDS_FOR_EMAIL,
    )
    user = await db.users.get_user_by_email(req.email)
    if user and not user.email_verified:
        sent = await _send_link_unless_recent(
            db, user, "email_verify", get_email_verification_ttl_minutes(),
            lambda token: verification_link(request, token), send_verification_email,
        )
        logger.info("Auth resend-verification %s: user_id=%s ip=%s", "sent" if sent else "throttled", user.id, request_ip)
    else:
        logger.warning("Auth resend-verification no-op: email_fp=%s ip=%s", email_fingerprint(req.email), request_ip)
    return MessageResponse(message=VERIFICATION_SENT_IF_ACCOUNT_EXISTS)


@router.post("/login", response_model=AuthUserResponse)
async def login(req: LoginRequest, request: Request, response: Response, db: DatabaseManager = Depends(get_db)):
    request_ip = client_ip(request)
    check_rate_limit(
        auth_request_rate_limiter, f"login:req:ip:{request_ip}",
        env_int("LOGIN_REQUEST_RATE_LIMIT_MAX_ATTEMPTS", 30), env_int("LOGIN_REQUEST_RATE_LIMIT_WINDOW_SECONDS", 60),
        TOO_MANY_LOGIN_REQUESTS,
    )
    ip_key, email_key = f"ip:{request_ip}", f"email:{req.email}"
    retry_after = max(login_rate_limiter.retry_after(ip_key) or 0, login_rate_limiter.retry_after(email_key) or 0)
    if retry_after > 0:
        logger.warning("Auth login rate-limited: email_fp=%s ip=%s", email_fingerprint(req.email), request_ip)
        raise HTTPException(429, TOO_MANY_LOGIN_ATTEMPTS, headers={"Retry-After": str(retry_after)})

    auth_user = await db.users.get_auth_user_by_email(req.email)
    pw_hash = auth_user["password_hash"] if auth_user else None
    if not auth_user or not pw_hash or not await verify_password_async(req.password, pw_hash):
        login_rate_limiter.register_failure(ip_key)
        login_rate_limiter.register_failure(email_key)
        logger.warning("Auth login failed: email_fp=%s ip=%s", email_fingerprint(req.email), request_ip)
        raise HTTPException(401, INVALID_CREDENTIALS)
    if not auth_user["email_verified"]:
        logger.warning("Auth login unverified: user_id=%s ip=%s", auth_user["id"], request_ip)
        raise HTTPException(403, EMAIL_NOT_VERIFIED)

    token = await auth_service.start_session(db, auth_user["id"], expected_password_hash=pw_hash)
    if token is None:
        logger.warning("Auth login lost a race with a password change: user_id=%s ip=%s", auth_user["id"], request_ip)
        raise HTTPException(401, INVALID_CREDENTIALS)
    login_rate_limiter.register_success(ip_key)
    login_rate_limiter.register_success(email_key)
    set_auth_cookie(response, token)
    logger.info("Auth login success: user_id=%s ip=%s", auth_user["id"], request_ip)
    return AuthUserResponse(
        user_id=auth_user["id"],
        name=auth_user["name"] or "",
        email=auth_user["email"] or "",
        email_verified=True,
        access_token=token,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: DatabaseManager = Depends(get_db),
):
    if credentials:
        await auth_service.end_sessions(
            db, credentials.credentials, request.cookies.get(get_access_token_cookie_name())
        )
    else:
        await auth_service.end_sessions(db, request_token(request, credentials))
    clear_auth_cookie(response)
    logger.info("Auth logout: ip=%s", client_ip(request))
    return MessageResponse(message=LOGGED_OUT)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(req: ForgotPasswordRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    request_ip = client_ip(request)
    check_rate_limit(
        auth_request_rate_limiter, f"forgot:req:ip:{request_ip}",
        env_int("FORGOT_PASSWORD_RATE_LIMIT_MAX_ATTEMPTS", 10),
        env_int("FORGOT_PASSWORD_RATE_LIMIT_WINDOW_SECONDS", 300),
        TOO_MANY_RESET_ATTEMPTS,
    )
    user = await db.users.get_user_by_email(req.email)
    if user and user.email_verified:
        sent = await _send_link_unless_recent(
            db, user, "password_reset", get_password_reset_ttl_minutes(),
            lambda token: password_reset_link(request, token), send_password_reset_email,
        )
        logger.info("Auth forgot-password %s: user_id=%s ip=%s", "sent" if sent else "throttled", user.id, request_ip)
    else:
        logger.warning("Auth forgot-password no-op: email_fp=%s ip=%s", email_fingerprint(req.email), request_ip)
    return MessageResponse(message=RESET_LINK_SENT_IF_ACCOUNT_EXISTS)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(req: ResetPasswordRequest, request: Request, db: DatabaseManager = Depends(get_db)):
    user_id = await auth_service.reset_password(db, req.token, req.new_password)
    if not user_id:
        logger.warning("Auth reset-password failed: ip=%s reason=invalid_or_expired_token", client_ip(request))
        raise HTTPException(400, INVALID_RESET_TOKEN)
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
