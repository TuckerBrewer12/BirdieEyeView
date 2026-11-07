"""The dashboard's figures come from the player's rounds, worked out on the server."""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from analytics import dashboard
from analytics import stats as analytics
from analytics.handicap import whs_window
from api.routers import stats
from models import HoleScore, Round, User
from tests.helpers import make_mock_database


def _round(strokes, par=4, putts=2, gir=None):
    return Round(hole_scores=[
        HoleScore(hole_number=i + 1, strokes=s, par_played=par, putts=putts, green_in_regulation=gir)
        for i, s in enumerate(strokes)
    ])


def test_scoring_average_over_all_or_the_last_few_to_a_tenth():
    rounds = [_round([5] * 18), _round([4] * 18), _round([4] * 9)]
    assert analytics.scoring_average(rounds) == 66.0  # (90 + 72 + 36) / 3
    assert analytics.scoring_average(rounds, 2) == 54.0
    assert analytics.scoring_average([_round([5] * 18), _round([4] * 17 + [5])]) == 81.5
    assert analytics.scoring_average([_round([5] * 18), _round([4] * 18), _round([4] * 17 + [5])]) == 78.3
    assert analytics.scoring_average([]) is None


def test_scoring_average_change_reads_the_last_few_against_the_window():
    rounds = [_round([5] * 18), _round([5] * 18), _round([4] * 18)]
    # The last two average 81 against 84 over all three.
    assert dashboard.scoring_average_change(rounds, 2) == -3.0
    assert dashboard.scoring_average_change([]) is None


def test_recent_form_reads_the_shared_figures_and_is_null_without_data():
    rounds = [_round([4] * 18, gir=True), _round([5] * 18, gir=False)]
    form = dashboard.recent_form(rounds)
    assert form == {
        "gir_pct": analytics.gir_percentage(rounds),
        "scrambling_pct": analytics.scrambling_percentage(rounds),
        "up_and_down_pct": analytics.up_and_down_percentage(rounds),
        "average_putts": analytics.average_putts(rounds),
    }
    assert form["gir_pct"] == 50.0
    assert form["average_putts"] == 36.0

    empty = dashboard.recent_form([Round(hole_scores=[HoleScore(hole_number=1, strokes=4)])])
    assert empty["gir_pct"] is None
    assert empty["average_putts"] is None


def test_putts_shown_prefers_the_last_five_and_rates_like_the_insights():
    # 30 or fewer is strong, up to 34 fair, over 34 weak: the analytics page's thresholds.
    assert dashboard.putts_shown(30.0, 33.0) == {"per_round": 30.0, "rating": "strong"}
    assert dashboard.putts_shown(34.0, None) == {"per_round": 34.0, "rating": "fair"}
    assert dashboard.putts_shown(34.4, None) == {"per_round": 34.4, "rating": "weak"}
    # Without putts in the last five, every round's average stands in.
    assert dashboard.putts_shown(None, 29.5) == {"per_round": 29.5, "rating": "strong"}
    assert dashboard.putts_shown(None, None) == {"per_round": None, "rating": None}


def test_score_mix_counts_classified_holes():
    mix = dashboard.score_mix([_round([3, 4, 4, 5])])
    assert mix["holes"] == 4
    assert mix["percentages"]["par"] == 50.0
    assert mix["percentages"]["birdie"] == 25.0
    assert mix["percentages"]["quad"] == 0.0


def test_handicap_change_reads_the_window():
    trend = [{"handicap_index": v} for v in (14.0, 13.5, 13.0, 12.8, 12.6, 12.4)]
    assert dashboard.handicap_change(trend) == {"delta": -1.6, "direction": "down"}
    assert dashboard.handicap_change([{"handicap_index": 10.0}]) == {"delta": None, "direction": None}
    flat = [{"handicap_index": v} for v in (10.0, 10.1, 10.2)]
    assert dashboard.handicap_change(flat)["direction"] == "flat"


def test_whs_window_matches_the_table():
    assert whs_window(2) == (0, 0.0)
    assert whs_window(3) == (1, -2.0)
    assert whs_window(40) == (8, 0.0)


def test_milestones_prefer_the_first_round_under_par_and_come_newest_first():
    achievements = {
        "round_milestones": {"lifetime": {
            "first_round_under_par": {"score": 71, "date": "2026-05-02", "course": "Blue Rock"},
            "score_breaks": [{"threshold": 80, "achievement": {"date": "2026-01-01", "course": "Muni"}}],
        }},
        "putting_milestones": {"lifetime": {"putt_breaks": [
            {"threshold": 30, "achievement": {"date": "2026-06-01", "course": "Muni", "round_id": "r9"}},
            {"threshold": 27, "achievement": None},
        ]}},
        "best_performance_streaks": {"lifetime": {"longest_par_streak": 4}},
        "best_performance_streaks_events": {"lifetime": {"longest_par_streak": None}},
    }
    assert dashboard.lifetime_milestones(achievements) == [
        {"kind": "putt_break", "value": 30, "date": "2026-06-01", "course": "Muni", "round_id": "r9"},
        {"kind": "under_par", "value": 71, "date": "2026-05-02", "course": "Blue Rock", "round_id": None},
    ]
    assert dashboard.lifetime_milestones({}) == []


def _dated_round(index, strokes):
    return Round(
        id=f"r{index}",
        date=datetime(2026, 1, 1, tzinfo=UTC) + timedelta(days=index),
        course_name_played="Muni",
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=s, par_played=4, putts=2) for i, s in enumerate(strokes)
        ],
    )


@pytest.mark.asyncio
async def test_dashboard_milestones_and_round_count_cover_the_whole_history():
    user_id = uuid4()
    user = User(id=str(user_id), name="Golfer")
    # The one round under par is the oldest of 25, outside the last 20.
    history = [_dated_round(0, [4] * 17 + [3])] + [_dated_round(i, [5] * 18) for i in range(1, 25)]
    newest_first = sorted(history, key=lambda r: r.date, reverse=True)

    async def rounds_for_user(_user_id, limit=20, offset=0, **_filters):
        return newest_first[offset:offset + limit]

    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=newest_first)
    db.rounds.get_rounds_for_user = AsyncMock(side_effect=rounds_for_user)
    db.rounds.count_rounds_for_user = AsyncMock(return_value=640)

    figures = await stats.get_dashboard(user_id, db, user)

    assert figures.total_rounds == 640
    under_par = [m for m in figures.milestones if m.kind == "under_par"]
    assert [m.value for m in under_par] == [71]
    # All eighteen holes of that round at par or better, the longest run on record.
    assert [m.value for m in figures.milestones if m.kind == "par_streak"] == [18]
