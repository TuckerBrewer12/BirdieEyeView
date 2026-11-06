from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

import api.main as api_main


def make_client(monkeypatch, **environment):
    for name, value in environment.items():
        monkeypatch.setenv(name, value)
    return TestClient(api_main.create_app(), base_url="http://localhost")


def test_root_reports_backend_status(monkeypatch):
    client = make_client(monkeypatch)

    response = client.get("/", headers={"user-agent": "browser"})

    assert response.json() == {"status": "ok", "service": "backend"}


def test_root_supports_head_and_security_headers(monkeypatch):
    client = make_client(monkeypatch)

    response = client.get("/", headers={"user-agent": "browser"})

    assert response.headers["x-content-type-options"] == "nosniff"
    assert client.head("/").status_code == 200


def test_health_reports_degraded_without_database(monkeypatch):
    client = make_client(monkeypatch)

    response = client.get("/api/health", headers={"user-agent": "browser"})

    assert response.json() == {"status": "degraded", "database": False}


def test_global_rate_limit_returns_public_error(monkeypatch):
    client = make_client(
        monkeypatch,
        API_RATE_LIMIT_MAX_REQUESTS="1",
        API_RATE_LIMIT_MAX_UNAUTH_REQUESTS="10",
    )

    first = client.get("/api/not-found", headers={"user-agent": "browser"})
    second = client.get("/api/not-found", headers={"user-agent": "browser"})

    assert (first.status_code, second.status_code) == (404, 429)
    assert second.json()["detail"] == "Too many requests. Please slow down."


def test_unhandled_api_error_returns_generic_detail(monkeypatch):
    client = make_client(monkeypatch)

    @client.app.get("/api/test-internal-error")
    async def internal_error():
        raise RuntimeError("password=secret courses.tees foreign_key_violation")

    client = TestClient(
        client.app,
        base_url="http://localhost",
        raise_server_exceptions=False,
    )

    response = client.get("/api/test-internal-error", headers={"user-agent": "browser"})

    assert (response.status_code, response.json()) == (
        500,
        {"detail": "Something went wrong. Please try again."},
    )
    assert "secret" not in response.text and "foreign_key" not in response.text


@pytest.mark.asyncio
async def test_lifespan_initializes_and_closes_database(monkeypatch):
    app = api_main.FastAPI()
    monkeypatch.setattr(api_main, "validate_deployment_security", MagicMock())
    monkeypatch.setattr(api_main.db, "initialize", AsyncMock())
    monkeypatch.setattr(api_main.db, "close", AsyncMock())
    monkeypatch.setattr(api_main.db, "_pool", MagicMock())

    async with api_main.lifespan(app):
        assert (app.state.db_manager is not None, app.state.db_connect_error) == (
            True,
            None,
        )

    api_main.db.initialize.assert_awaited_once()
    api_main.db.close.assert_awaited_once()
