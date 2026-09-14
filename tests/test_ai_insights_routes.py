from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.routers import ai_insights
from tests.helpers import make_http_request, make_mock_database, make_user


def configure_ai_route(monkeypatch, limiter_results):
    user_id = uuid4()
    user = make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    ai_service = MagicMock()
    ai_service.generate_suggestions = AsyncMock(return_value={"ok": True})
    monkeypatch.setattr(ai_insights, "AIService", lambda database: ai_service)
    limiter = MagicMock()
    limiter.check.side_effect = limiter_results
    monkeypatch.setattr(ai_insights, "ai_rate_limiter", limiter)
    return user_id, user, db, ai_service


@pytest.mark.asyncio
async def test_ai_suggestions_returns_service_response(monkeypatch):
    user_id, user, db, ai_service = configure_ai_route(monkeypatch, [(True, 0), (True, 0)])

    result = await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, 5.0, db, user)

    assert result == {"ok": True}
    ai_service.generate_suggestions.assert_awaited_once()


@pytest.mark.asyncio
async def test_ai_suggestions_enforces_ip_rate_limit(monkeypatch):
    user_id, user, db, _ = configure_ai_route(monkeypatch, [(False, 9)])

    with pytest.raises(HTTPException) as raised:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)

    assert (raised.value.status_code, raised.value.headers["Retry-After"]) == (429, "9")


@pytest.mark.asyncio
async def test_ai_suggestions_enforces_user_rate_limit(monkeypatch):
    user_id, user, db, _ = configure_ai_route(monkeypatch, [(True, 0), (False, 7)])

    with pytest.raises(HTTPException) as raised:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)

    assert (raised.value.status_code, raised.value.headers["Retry-After"]) == (429, "7")
