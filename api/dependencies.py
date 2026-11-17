import ipaddress
import os
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from typing import Optional

from api.messages import (
    CROSS_SITE_REQUEST_REFUSED, FORBIDDEN, INVALID_OR_EXPIRED_TOKEN, NOT_AUTHENTICATED, USER_NOT_FOUND,
)
from api.error_responses import SERVICE_UNAVAILABLE


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _trusted_proxy_networks() -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    raw = os.environ.get("TRUSTED_PROXY_CIDRS", "127.0.0.1/32,::1/128")
    out: list = []
    for part in raw.split(","):
        cidr = part.strip()
        if not cidr:
            continue
        try:
            out.append(ipaddress.ip_network(cidr, strict=False))
        except ValueError:
            continue
    return out


def _peer_is_trusted_proxy(peer_host: str) -> bool:
    try:
        peer_ip = ipaddress.ip_address(peer_host)
    except ValueError:
        return False
    return any(peer_ip in network for network in _trusted_proxy_networks())


def client_ip(request: Request) -> str:
    peer_host = request.client.host if request.client else "unknown"
    fwd = request.headers.get("x-forwarded-for")
    trust_proxy_headers = _env_bool("TRUST_PROXY_HEADERS", False)
    if fwd and trust_proxy_headers and _peer_is_trusted_proxy(peer_host):
        return fwd.split(",")[0].strip()
    return peer_host

from api.auth_utils import decode_access_token, get_access_token_cookie_name
from api.security import cors_allowed_origins, request_origin
from database.db_manager import DatabaseManager
from models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_db(request: Request) -> DatabaseManager:
    db_manager = getattr(request.app.state, "db_manager", None)
    if db_manager is None:
        raise HTTPException(503, SERVICE_UNAVAILABLE)
    return db_manager


UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def request_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> Optional[str]:
    if credentials:
        return credentials.credentials
    token = request.cookies.get(get_access_token_cookie_name())
    if token and request.method in UNSAFE_METHODS and request_origin(request) not in cors_allowed_origins():
        raise HTTPException(403, CROSS_SITE_REQUEST_REFUSED)
    return token


async def _session_payload(db: DatabaseManager, token: str) -> Optional[dict]:
    payload = decode_access_token(token)
    if not payload or not payload.get("sub") or not payload.get("jti"):
        return None
    if not await db.users.session_is_active(payload["jti"], payload["sub"]):
        return None
    return payload


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: DatabaseManager = Depends(get_db),
):
    token = request_token(request, credentials)
    if not token:
        raise HTTPException(401, NOT_AUTHENTICATED)
    payload = await _session_payload(db, token)
    if not payload:
        raise HTTPException(401, INVALID_OR_EXPIRED_TOKEN)
    user = await db.users.get_user(payload["sub"])
    if not user:
        raise HTTPException(401, USER_NOT_FOUND)
    return user


async def get_optional_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: DatabaseManager = Depends(get_db),
):
    token = request_token(request, credentials)
    if not token:
        return None
    payload = await _session_payload(db, token)
    return await db.users.get_user(payload["sub"]) if payload else None


async def get_self(user_id: UUID, current_user: User = Depends(get_current_user)) -> User:
    if str(current_user.id) != str(user_id):
        raise HTTPException(403, FORBIDDEN)
    return current_user
