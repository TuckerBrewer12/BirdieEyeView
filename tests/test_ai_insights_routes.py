from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from analytics import handicap as hcap
from api.main import app
from api.round_responses import round_summary
from api.routers import ai_insights, courses, rounds, stats, users
from database.exceptions import DuplicateError, IntegrityError, NotFoundError
from models import Course, Hole, HoleScore, Round, User, UserTee
from models.course import CourseSummary
from tests.helpers import make_http_request, make_mock_database, make_user
from tests.route_fixtures import (
    friendship_row,
    listed_round,
    pebble_beach,
    pebble_beach_summary,
    played_round,
    profile_user,
)


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


@pytest.mark.asyncio
async def test_ai_insights_success_and_rate_limits(monkeypatch):
    user_id = uuid4()
    user = profile_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    ai_service = MagicMock()
    ai_service.generate_suggestions = AsyncMock(return_value={"ok": True})
    monkeypatch.setattr(ai_insights, "AIService", lambda db: ai_service)

    ai_rate_limiter = MagicMock()
    ai_rate_limiter.check.side_effect = [(True, 0), (True, 0)]
    monkeypatch.setattr(ai_insights, "ai_rate_limiter", ai_rate_limiter)
    assert await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, 5.0, db, user) == {"ok": True}

    ai_rate_limiter.check.side_effect = [(False, 9)]
    with pytest.raises(HTTPException) as exc:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)
    assert exc.value.status_code == 429

    ai_rate_limiter.check.side_effect = [(True, 0), (False, 7)]
    with pytest.raises(HTTPException) as exc:
        await ai_insights.get_ai_suggestions(user_id, make_http_request(), 10, None, db, user)
    assert exc.value.headers["Retry-After"] == "7"
