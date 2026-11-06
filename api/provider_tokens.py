"""Verify OpenID Connect ID tokens from sign-in providers (Google, Apple).

Each provider publishes its signing keys as a JWKS document. Keys are fetched asynchronously so a
slow provider never blocks the event loop, cached for an hour, and refetched early when a token names
a key we have not seen (the provider rotated its keys). A provider we cannot reach raises
``ProviderUnavailableError``; any token that fails a check raises ``ProviderTokenError``.
"""

import time
from collections.abc import Iterable
from typing import Any

import httpx
from jose import jwk, jwt
from jose.exceptions import JOSEError

_ALGORITHM = "RS256"
_LEEWAY_SECONDS = 60
_REQUIRED_CLAIMS = {"require_exp": True, "require_iat": True, "require_iss": True, "require_sub": True}


class ProviderTokenError(Exception):
    """The token is malformed, unsigned by the provider, or fails a claim check."""


class ProviderUnavailableError(Exception):
    """The provider's signing keys could not be fetched."""


class JwksCache:
    """A provider's signing keys, cached and refreshed on an unknown key id."""

    TTL_SECONDS = 3600
    MIN_REFRESH_SECONDS = 60
    TIMEOUT_SECONDS = 5.0

    def __init__(self, url: str):
        self.url = url
        self.transport: httpx.AsyncBaseTransport | None = None  # tests install an httpx.MockTransport
        self.clear()

    def clear(self) -> None:
        self._keys: dict[str, dict[str, Any]] = {}
        self._fetched_at: float | None = None

    async def fetch_keys(self) -> list[dict[str, Any]]:
        """Download the JWKS document; the only network call."""
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT_SECONDS, transport=self.transport) as client:
                response = await client.get(self.url)
                response.raise_for_status()
                keys = response.json().get("keys")
        except (httpx.HTTPError, ValueError, AttributeError) as error:
            raise ProviderUnavailableError(f"Could not fetch signing keys from {self.url}") from error
        if not isinstance(keys, list):
            raise ProviderUnavailableError(f"Signing keys from {self.url} are not a list")
        return keys

    async def _refresh(self) -> None:
        keys = await self.fetch_keys()
        self._keys = {key["kid"]: key for key in keys if isinstance(key, dict) and isinstance(key.get("kid"), str)}
        self._fetched_at = time.monotonic()

    async def get(self, kid: str) -> dict[str, Any] | None:
        age = None if self._fetched_at is None else time.monotonic() - self._fetched_at
        if age is None or age >= self.TTL_SECONDS or (kid not in self._keys and age >= self.MIN_REFRESH_SECONDS):
            await self._refresh()
        return self._keys.get(kid)


async def verify_id_token(
    token: str,
    *,
    keys: JwksCache,
    audiences: Iterable[str],
    issuers: Iterable[str],
) -> dict[str, Any]:
    """Return the token's claims after checking signature, issuer, audience, expiry and subject."""
    try:
        header = jwt.get_unverified_header(token)
    except JOSEError as error:
        raise ProviderTokenError("Malformed token header") from error
    kid = header.get("kid")
    if header.get("alg") != _ALGORITHM or not isinstance(kid, str):
        raise ProviderTokenError("Unsupported algorithm or missing key id")

    key_data = await keys.get(kid)
    if key_data is None:
        raise ProviderTokenError("Token signed with an unknown key")

    try:
        public_key = jwk.construct(key_data, _ALGORITHM)
    except (JOSEError, KeyError, TypeError, ValueError) as error:
        raise ProviderTokenError("Provider key cannot verify RS256 signatures") from error

    try:
        # python-jose accepts only a single audience string, so audience is checked below.
        claims = jwt.decode(
            token,
            public_key,
            algorithms=[_ALGORITHM],
            issuer=list(issuers),
            options={**_REQUIRED_CLAIMS, "verify_aud": False, "leeway": _LEEWAY_SECONDS},
        )
    except JOSEError as error:
        raise ProviderTokenError("Signature or claims are invalid") from error

    token_audiences = claims.get("aud")
    if isinstance(token_audiences, str):
        token_audiences = [token_audiences]
    if not isinstance(token_audiences, list) or not set(token_audiences) & set(audiences):
        raise ProviderTokenError("Token is not issued for this app")
    if not str(claims.get("sub") or "").strip():
        raise ProviderTokenError("Token has no subject")
    return claims
