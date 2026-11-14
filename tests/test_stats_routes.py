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
from tests.helpers import make_http_request, make_mock_database, make_round, make_round_summary, make_user
from tests.route_fixtures import (
    friendship_row,
    listed_round,
    pebble_beach,
    pebble_beach_summary,
    played_round,
    profile_user,
)


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
async def test_milestones_returns_empty_state(stats_database):
    user_id, _, _, user, db = stats_database
    db.rounds.get_rounds_for_user.return_value = []

    result = await stats.get_milestones(user_id, 12, db, user)

    assert result == {"milestones": []}


@pytest.mark.asyncio
async def test_dashboard_and_empty_analytics(monkeypatch):
    user_id = uuid4()
    round_id = uuid4()
    user = profile_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[listed_round(round_id)])
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], [], []])
    monkeypatch.setattr(stats.hcap, "handicap_index", lambda rounds, **_: 10.0)

    dashboard = await stats.get_dashboard(user_id, db, user)
    assert dashboard.best_round_id == str(round_id)
    assert dashboard.scoring_average_l5 is None
    assert dashboard.whs.window_size == 0
    assert dashboard.score_trend == []
    assert dashboard.handicap_trend == []
    last = dashboard.recent_rounds[0]
    assert last.hole_scores[-1].running_to_par == last.to_par

    db.rounds.get_rounds_for_user = AsyncMock(side_effect=[[], [], []])
    analytics = await stats.get_analytics(user_id, 50, None, None, db, user)
    assert analytics.kpis.total_rounds == 0
    assert analytics.kpis.scoring_average is None
    assert analytics.scoring_by_yardage == []
    assert analytics.notable_achievements.round_milestones.lifetime.first_eagle is None
    assert analytics.notable_achievements.career_totals.lifetime.total_birdies == 0
    assert len(analytics.notable_achievements.round_milestones.lifetime.score_breaks) == 11


@pytest.mark.asyncio
async def test_stats_auxiliary_endpoints(monkeypatch):
    user_id = uuid4()
    course_id = uuid4()
    round_id = uuid4()
    user = profile_user(user_id, scoring_goal=85, home_course_id=str(course_id))
    stored_round = played_round(round_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_played_courses_for_user = AsyncMock(
        return_value=[{"id": str(course_id), "name": "Pebble Beach", "location": None}]
    )
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[stored_round])

    played = await stats.get_played_courses(user_id, db, user)
    assert [c.model_dump() for c in played] == [{"id": str(course_id), "name": "Pebble Beach", "location": None}]

    report = await stats.get_goal_report(user_id, 50, db, user)
    assert report.scoring_goal == 85
    assert report.scoring_average == 9.0
    assert report.on_track is True

    round_comparison = await stats.get_round_comparison(user_id, round_id, db, user)
    assert [w.window for w in round_comparison.windows] == ["l5", "l20", "all"]
    score = round_comparison.windows[0].metrics[0]
    assert score.metric == "score"
    assert score.value == 9

    db.rounds.get_rounds_for_user.return_value = []
    assert await stats.get_milestones(user_id, 12, db, user) == {"milestones": []}

    course_analytics = await stats.get_course_analytics(user_id, course_id, db, user)
    assert course_analytics.rounds_played == 0
    assert course_analytics.course_id == str(course_id)
    assert course_analytics.scoring_average is None


@pytest.mark.asyncio
async def test_benchmark_comparison_endpoint():
    user_id, friend_id = uuid4(), uuid4()
    user = profile_user(user_id)
    db = make_mock_database()
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[listed_round(uuid4()), listed_round(uuid4())])
    db.friendships.are_friends = AsyncMock(return_value=True)

    handicap = await stats.get_benchmark_comparison(user_id, "handicap", 15, None, 20, db, user)
    assert (handicap.against, handicap.handicap) == ("handicap", 15)
    assert handicap.benchmark.par4_to_par == 1.025
    assert (handicap.par_types[1].gap, handicap.par_types[1].verdict) == (-0.58, "ahead")

    friend = await stats.get_benchmark_comparison(user_id, "friend", None, friend_id, 20, db, user)
    assert friend.benchmark.par4_to_par == pytest.approx(8 / 18)
    db.friendships.are_friends.assert_awaited_with(str(user_id), str(friend_id))

    for against, handicap_arg, friend_arg in [("handicap", 7, None), ("handicap", None, None), ("friend", None, None)]:
        with pytest.raises(HTTPException) as missing:
            await stats.get_benchmark_comparison(user_id, against, handicap_arg, friend_arg, 20, db, user)
        assert missing.value.status_code == 422

    db.friendships.are_friends = AsyncMock(return_value=False)
    with pytest.raises(HTTPException) as stranger:
        await stats.get_benchmark_comparison(user_id, "friend", None, friend_id, 20, db, user)
    assert stranger.value.status_code == 403
    with pytest.raises(HTTPException) as someone_else:
        await stats.get_benchmark_comparison(friend_id, "handicap", 15, None, 20, db, user)
    assert someone_else.value.status_code == 403
