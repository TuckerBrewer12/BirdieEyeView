"""WHS-based estimate: eligibility, precision, selection context and one index for every caller."""

from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

import analytics.handicap as handicap
from api.routers import stats, users
from models.hole_layout import FRONT_NINE
from tests.analytics_builders import course, par_round
from tests.helpers import make_mock_database, make_round_summary, make_user

START = datetime(2026, 1, 1)


def rated_rounds(overs, *, rating=72.0, slope=113):
    """Complete rated 18-hole rounds, one day apart; differential = over when rating=par=72, slope=113."""
    c = course(18, rating=rating, slope=slope)
    return [
        par_round(over=over, course_obj=c, tee_box="Blue", round_id=f"r{i}", date=START + timedelta(days=i))
        for i, over in enumerate(overs)
    ]


def test_partial_rounds_never_produce_a_differential():
    partial_nine = par_round(holes=[1, 2, 3, 4, 5], course_obj=course(9, rating=35.0, slope=113), tee_box="Blue")

    assert handicap._get_differential_for_round(partial_nine) is None


def test_differentials_round_half_up_and_the_index_uses_the_shown_values():
    c = course(18, rating=72.0, slope=100)
    r = par_round(over=15, course_obj=c, tee_box="Blue")  # 87: (87 - 72) * 113 / 100 = 16.95

    assert handicap.score_differentials_per_round([r])[0]["differential"] == 17.0


def test_index_and_used_flags_come_from_the_same_selection():
    rounds = rated_rounds([0] * 8 + [10] * 12)

    trend = handicap.handicap_trend(rounds)

    assert trend[-1]["handicap_index"] == 0.0
    assert [e["used_in_hi"] for e in trend] == [True] * 8 + [False] * 12


def test_display_window_shows_flags_from_the_full_history():
    rounds = rated_rounds([0] * 8 + [10] * 12)

    shown = stats._build_handicap_trend(rounds, rounds[-5:], make_user(uuid4()))

    assert len(shown) == 5 and not any(e["used_in_hi"] for e in shown)
    assert [e["round_index"] for e in shown] == [1, 2, 3, 4, 5]


def test_rounds_before_a_reset_are_not_marked_used():
    rounds = rated_rounds([20] * 8 + [30] * 12)
    reset = rounds[8].date

    trend = handicap.handicap_trend(rounds, seed_handicap=15.0, seed_set_at=reset)

    assert trend[-1]["handicap_index"] == 30.0
    assert not any(e["used_in_hi"] for e in trend[:8])


def test_index_sorts_by_date_whatever_the_input_order():
    rounds = rated_rounds([0] * 8 + [20] * 20)

    assert handicap.handicap_index(rounds) == handicap.handicap_index(list(reversed(rounds))) == 20.0


@pytest.mark.parametrize("use_last_n", [0, 21])
def test_window_is_bounded(use_last_n):
    with pytest.raises(ValueError):
        handicap.handicap_index([], use_last_n)


def test_zero_slope_and_high_seed_are_handled():
    with pytest.raises(ValueError):
        handicap.score_differential(90, 72.0, 0)
    assert handicap.handicap_index([], seed_handicap=60.0) == 54.0


def test_nine_hole_rounds_are_excluded_from_the_index():
    nines = [par_round(holes=FRONT_NINE, course_obj=course(9, rating=35.0, slope=113), tee_box="Blue",
                       round_id=str(i)) for i in range(5)]

    assert handicap.handicap_index(nines) is None


@pytest.mark.asyncio
async def test_every_screen_reports_the_same_seeded_index():
    user_id = uuid4()
    user = make_user(user_id, handicap=18.2, last_handicap_update=START)
    history = rated_rounds([10, 12])
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=list(reversed(history)))
    db.rounds.get_round_summaries_for_user = AsyncMock(return_value=[make_round_summary(uuid4())])

    from_users = (await users.get_user_handicap(user_id, db, user))["handicap_index"]
    from_dashboard = (await stats.get_dashboard(user_id, db, user)).handicap_index
    from_analytics = (await stats.get_analytics(user_id, 50, None, None, db, user))["kpis"]["handicap_index"]

    assert from_users == from_dashboard == from_analytics == 10.0
    assert all(call.kwargs.get("limit") in (None, 50) for call in db.rounds.get_rounds_for_user.await_args_list)


def test_user_handicap_index_uses_the_seed_and_reset():
    user = SimpleNamespace(handicap=18.2, last_handicap_update=None)

    assert handicap.user_handicap_index([], user) == 18.2
