"""Stats endpoints: complete rounds by format, one response shape, scopes and errors."""

from datetime import datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from api.routers import stats
from models.hole_layout import FRONT_NINE
from tests.analytics_builders import course, par_round, round_
from tests.helpers import make_mock_database, make_round_summary, make_user


def summary(score, *, complete=True, holes=18, putts=30, gir=9):
    return {**make_round_summary(uuid4()), "total_score": score, "is_complete": complete,
            "hole_count": holes, "total_putts": putts, "total_gir": gir}


@pytest.mark.asyncio
async def test_dashboard_totals_complete_rounds_by_format(monkeypatch):
    user_id = uuid4()
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=make_user(user_id))
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[
        summary(80), summary(90), summary(40, holes=9, putts=15, gir=4), summary(4, complete=False),
    ])
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[])

    dashboard = await stats.get_dashboard(user_id, db, make_user(user_id))

    assert (dashboard.scoring_average, dashboard.best_round) == (85.0, 80)
    assert (dashboard.scoring_average_nine, dashboard.best_round_nine, dashboard.average_putts_nine) == (40.0, 40, 15.0)
    assert dashboard.total_rounds == 4
    assert db.rounds.get_round_summaries_for_user.await_args.kwargs["limit"] is None


def analytics_db(user, *rounds_per_call):
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=list(rounds_per_call))
    return db


def assert_same_keys(left, right, path="response"):
    """Same dict keys at every level where both sides are dicts (a null value matches any value)."""
    if isinstance(left, dict) and isinstance(right, dict):
        assert set(left) == set(right), path
        for key in left:
            assert_same_keys(left[key], right[key], f"{path}.{key}")


@pytest.mark.asyncio
async def test_empty_and_populated_analytics_have_the_same_keys():
    user_id = uuid4()
    user = make_user(user_id)
    played = [par_round(round_id="r1")]

    empty = await stats.get_analytics(user_id, 50, None, None, analytics_db(user, [], [], []), user)
    populated = await stats.get_analytics(user_id, 50, None, None, analytics_db(user, played, played, played), user)

    assert_same_keys(empty, populated)
    assert "scoring_by_yardage" in empty


@pytest.mark.asyncio
async def test_analytics_kpis_use_complete_rounds_by_format_and_every_opportunity():
    user_id = uuid4()
    user = make_user(user_id)
    full = par_round(over=8, round_id="full")
    nine = par_round(holes=FRONT_NINE, course_obj=course(9), round_id="nine")
    partial = round_({1: {"strokes": 4}}, course_obj=course(18), round_id="partial")
    one_of_one = round_({1: {"strokes": 4, "par_played": 4, "green_in_regulation": False}}, round_id="a")
    zero_of_nine = round_({n: {"strokes": 6, "par_played": 4, "green_in_regulation": False} for n in range(1, 10)},
                          round_id="b")
    rounds = [full, nine, partial, one_of_one, zero_of_nine]

    result = await stats.get_analytics(user_id, 50, None, None, analytics_db(user, rounds, rounds, rounds), user)

    kpis = result["kpis"]
    assert (kpis["scoring_average"], kpis["scoring_average_nine"]) == (80.0, 36.0)
    assert kpis["scrambling_percentage"] == pytest.approx(10.0)


@pytest.mark.asyncio
async def test_home_filter_without_a_home_course_matches_nothing():
    user_id = uuid4()
    user = make_user(user_id)
    db = analytics_db(user, [par_round(round_id="elsewhere")])

    result = await stats.get_analytics(user_id, 50, "home", None, db, user)

    assert result["kpis"]["total_rounds"] == 0
    # Only the unfiltered handicap history is read; no course-filtered round query runs.
    assert [call.kwargs.get("course_id") for call in db.rounds.get_rounds_for_user.await_args_list] == [None]


@pytest.mark.asyncio
async def test_achievements_use_the_full_history():
    user_id = uuid4()
    user = make_user(user_id)
    old_best = par_round(over=-1, round_id="old", date=datetime(2020, 1, 1))
    db = analytics_db(user, [], [old_best])

    result = await stats.get_analytics(user_id, 5, None, "ytd", db, user)

    assert result["notable_achievements"]["scoring_records"]["lifetime"]["lowest_round"] == 71
    lifetime_call = db.rounds.get_rounds_for_user.await_args_list[1]
    assert lifetime_call.kwargs["limit"] is None and "date_from" not in lifetime_call.kwargs


@pytest.mark.asyncio
async def test_goal_report_distinguishes_missing_user_from_missing_goal():
    user_id = uuid4()
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as missing_user:
        await stats.get_goal_report(user_id, 50, db, make_user(user_id))
    db.users.get_user = AsyncMock(return_value=make_user(user_id))
    with pytest.raises(HTTPException) as missing_goal:
        await stats.get_goal_report(user_id, 50, db, make_user(user_id))

    assert (missing_user.value.status_code, missing_goal.value.status_code) == (404, 400)


@pytest.mark.asyncio
async def test_round_comparison_searches_the_full_history():
    user_id = uuid4()
    db = make_mock_database()
    target = par_round(round_id=str(uuid4()))
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[target])
    result = await stats.get_round_comparison(user_id, target.id, db, make_user(user_id))

    assert "score" in result
    assert db.rounds.get_rounds_for_user.await_args.kwargs["limit"] is None


@pytest.mark.asyncio
async def test_milestones_sort_by_round_date():
    user_id = uuid4()
    user = make_user(user_id)
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    first = par_round(over=10, round_id="first", date=datetime(2025, 12, 31))   # breaks 85
    later = par_round(over=-1, round_id="later", date=datetime(2026, 1, 9))    # breaks 75, under par
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[later, first])

    result = await stats.get_milestones(user_id, 50, db, user)

    dates = [m["date"] for m in result["milestones"]]
    assert dates[0] == "2026/1/9" and dates[-1] == "2025/12/31"
