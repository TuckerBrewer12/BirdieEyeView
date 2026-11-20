from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest

from analytics import handicap as hcap
from analytics.player_history import HOME_COURSE, PlayerHistory, timeframe_start
from tests.analytics_builders import course, par_round
from tests.helpers import make_user

START = datetime(2026, 1, 1, tzinfo=timezone.utc)
HOME = course(18, course_id="home-course", rating=72.0, slope=113)
AWAY = course(18, course_id="away-course", rating=72.0, slope=113)


def _round(round_id, day, *, on=HOME, over=10):
    played = START + timedelta(days=day) if day is not None else None
    return par_round(over=over, course_obj=on, tee_box="Blue", round_id=round_id, date=played)


class _Rounds:
    def __init__(self, newest_first):
        self.newest_first = newest_first
        self.requests = []

    async def get_rounds_for_user(self, user_id, *, limit):
        self.requests.append((user_id, limit))
        return self.newest_first


def _ids(rounds):
    return [r.id for r in rounds]


def test_rounds_run_by_date_with_same_day_rounds_in_the_order_they_were_saved_and_undated_last():
    undated, later_same_day, earlier_same_day, first = (
        _round("undated", None), _round("second-that-day", 3), _round("first-that-day", 3), _round("first", 1)
    )

    history = PlayerHistory(None, [later_same_day, earlier_same_day, first, undated])

    assert _ids(history.rounds) == ["first", "first-that-day", "second-that-day", "undated"]
    assert _ids(history.newest_first) == ["second-that-day", "first-that-day", "first", "undated"]


def test_a_window_keeps_the_newest_rounds_the_filters_allow():
    newest_first = [_round("r5", 5, on=AWAY), _round("r4", 4), _round("r3", 3), _round("r2", 2, on=AWAY),
                    _round("r1", 1), _round("undated", None)]
    history = PlayerHistory(make_user(uuid4(), home_course_id=HOME.id), newest_first)

    assert _ids(history.window(limit=3).rounds) == ["r3", "r4", "r5"]
    assert _ids(history.window(limit=3).newest_first) == ["r5", "r4", "r3"]
    assert _ids(history.window(course_id=AWAY.id).rounds) == ["r2", "r5"]
    assert _ids(history.window(course_id=HOME_COURSE, limit=2).rounds) == ["r3", "r4"]
    assert _ids(history.window(since=(START + timedelta(days=3)).date()).rounds) == ["r3", "r4", "r5"]
    assert _ids(history.window().rounds) == ["r1", "r2", "r3", "r4", "r5", "undated"]


def test_the_home_course_window_is_empty_without_a_home_course():
    history = PlayerHistory(make_user(uuid4()), [_round("r1", 1)])

    assert history.window(course_id=HOME_COURSE) == history.window(course_id=HOME_COURSE, limit=5)
    assert history.window(course_id=HOME_COURSE).rounds == []


def test_timeframes_start_at_new_year_or_a_year_back():
    today = date(2026, 8, 20)

    assert timeframe_start("ytd", today) == date(2026, 1, 1)
    assert timeframe_start("1y", today) == date(2025, 8, 20)
    assert timeframe_start(None, today) is None


def test_the_index_and_each_rounds_trend_row_come_from_the_whole_history():
    oldest_first = [_round(f"r{i}", i, over=over) for i, over in enumerate([0] * 8 + [10] * 12)]
    user = make_user(uuid4(), handicap=None)
    history = PlayerHistory(user, list(reversed(oldest_first)))

    recent = history.window(limit=5).rounds
    rows = history.handicap_rows(recent)

    assert history.handicap_index == hcap.player_handicap_index(user, oldest_first) == 0.0
    assert [row["round_id"] for row in rows] == _ids(recent)
    assert [row["round_index"] for row in rows] == [16, 17, 18, 19, 20]
    assert not any(row["used_in_hi"] for row in rows)
    assert _ids(history.index_rounds) == _ids(oldest_first)


def test_the_last_full_rounds_skip_nines_and_unfinished_rounds():
    nine = par_round(holes=range(1, 10), course_obj=course(9), round_id="nine", date=START + timedelta(days=4))
    unfinished = par_round(holes=range(1, 6), course_obj=course(18), round_id="unfinished", date=START + timedelta(days=5))
    history = PlayerHistory(None, [unfinished, nine, _round("r3", 3), _round("r2", 2), _round("r1", 1)])

    assert _ids(history.last_full_rounds(2)) == ["r2", "r3"]


@pytest.mark.asyncio
async def test_loading_reads_every_round_once():
    user = make_user(uuid4())
    source = _Rounds([_round("r2", 2), _round("r1", 1)])

    history = await PlayerHistory.load(source, user)

    assert source.requests == [(user.id, None)]
    assert _ids(history.rounds) == ["r1", "r2"]


@pytest.mark.asyncio
async def test_nobody_signed_in_has_no_history_and_no_index():
    source = _Rounds([_round("r1", 1)])

    history = await PlayerHistory.load(source, None)

    assert source.requests == [] and history.rounds == [] and history.handicap_index is None
