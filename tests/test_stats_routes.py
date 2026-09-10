from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from api.routers import stats
from tests.helpers import make_mock_database, make_round, make_round_summary, make_user


@pytest.mark.asyncio
async def test_dashboard_summarizes_round_history(monkeypatch):
    user_id = uuid4()
    round_id = uuid4()
    user = make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[make_round_summary(round_id)])
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], [], []])
    monkeypatch.setattr(stats.hcap, "handicap_index", lambda rounds: 10.0)

    dashboard = await stats.get_dashboard(user_id, db, user)

    assert (dashboard.total_rounds, dashboard.scoring_average) == (1, 80.0)
    assert dashboard.best_round_id == str(round_id)


@pytest.mark.asyncio
async def test_analytics_returns_empty_state():
    user_id = uuid4()
    user = make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], []])

    analytics = await stats.get_analytics(user_id, 50, None, None, db, user)

    assert analytics["kpis"]["total_rounds"] == 0
    assert analytics["notable_achievements"]["round_milestones"]["lifetime"]["first_eagle"] is None


@pytest.fixture
def stats_database():
    user_id = uuid4()
    course_id = uuid4()
    round_id = uuid4()
    user = make_user(user_id, scoring_goal=85, home_course_id=str(course_id))
    stored_round = make_round(round_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_played_courses_for_user = AsyncMock(return_value=[{"id": str(course_id)}])
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[stored_round])
    return user_id, course_id, round_id, user, db


@pytest.mark.asyncio
async def test_get_played_courses_returns_repository_rows(stats_database):
    user_id, course_id, _, user, db = stats_database

    result = await stats.get_played_courses(user_id, db, user)

    assert result == [{"id": str(course_id)}]


@pytest.mark.asyncio
async def test_goal_report_uses_goal_engine(monkeypatch, stats_database):
    user_id, _, _, user, db = stats_database
    monkeypatch.setattr(
        "analytics.goals.goal_report",
        lambda rounds, scoring_goal, home_rounds: {"gap": 5},
    )

    report = await stats.get_goal_report(user_id, 50, db, user)

    assert report["gap"] == 5


@pytest.mark.asyncio
async def test_round_comparison_returns_all_metric_groups(stats_database):
    user_id, _, round_id, user, db = stats_database

    comparison = await stats.get_round_comparison(user_id, round_id, db, user)

    assert set(comparison) == {
        "score",
        "putts",
        "gir",
        "three_putts",
        "putts_per_gir",
        "scrambling",
    }


@pytest.mark.asyncio
async def test_milestones_returns_empty_state(stats_database):
    user_id, _, _, user, db = stats_database
    db.rounds.get_rounds_for_user.return_value = []

    result = await stats.get_milestones(user_id, 12, db, user)

    assert result == {"milestones": []}


@pytest.mark.asyncio
async def test_course_analytics_returns_empty_state(stats_database):
    user_id, course_id, _, user, db = stats_database
    db.rounds.get_rounds_for_user.return_value = []

    result = await stats.get_course_analytics(user_id, course_id, db, user)

    assert (result["course_id"], result["rounds_played"]) == (str(course_id), 0)
