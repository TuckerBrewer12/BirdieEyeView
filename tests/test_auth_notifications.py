import json

import httpx
import pytest

from api.auth_notifications import send_password_reset_email, send_verification_email


def _client_with(monkeypatch, handler, captured=None):
    real_client = httpx.AsyncClient

    def _client(**kwargs):
        if captured is not None:
            captured["client_kwargs"] = kwargs
        return real_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr("api.auth_notifications.httpx.AsyncClient", _client)


@pytest.mark.asyncio
async def test_resend_disabled_without_api_key(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)

    def _handler(request):
        raise AssertionError("Resend should not be called without RESEND_API_KEY")

    _client_with(monkeypatch, _handler)

    await send_verification_email("user@example.com", "https://example.com/verify?token=abc")


@pytest.mark.asyncio
async def test_resend_api_payload(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "resend_test_key")
    monkeypatch.setenv("AUTH_FROM_EMAIL", "noreply@birdie-eye-view.com")
    monkeypatch.setenv("RESEND_API_URL", "https://api.resend.com/emails")
    monkeypatch.setenv("RESEND_TIMEOUT_SECONDS", "7.5")

    captured = {}

    def _handler(request):
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        captured["json"] = json.loads(request.content)
        return httpx.Response(200, json={"id": "email-1"})

    _client_with(monkeypatch, _handler, captured)

    await send_password_reset_email("user@example.com", "https://example.com/reset?token=def")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer resend_test_key"
    assert captured["headers"]["Content-Type"] == "application/json"
    assert captured["json"]["from"] == "noreply@birdie-eye-view.com"
    assert captured["json"]["to"] == ["user@example.com"]
    assert captured["json"]["subject"] == "Reset your ScanScorecards password"
    assert "https://example.com/reset?token=def" in captured["json"]["text"]
    assert captured["client_kwargs"]["timeout"] == 7.5


@pytest.mark.asyncio
async def test_resend_error_status_raises(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "resend_test_key")
    _client_with(monkeypatch, lambda request: httpx.Response(500))

    with pytest.raises(httpx.HTTPStatusError):
        await send_verification_email("user@example.com", "https://example.com/verify?token=abc")
