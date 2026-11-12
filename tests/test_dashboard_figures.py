"""The dashboard's figures come from the player's rounds, worked out on the server."""

from analytics import dashboard
from analytics.handicap import whs_window
from models import HoleScore, Round


def _round(strokes, par=4, putts=2, gir=None):
    return Round(hole_scores=[
        HoleScore(hole_number=i + 1, strokes=s, par_played=par, putts=putts, green_in_regulation=gir)
        for i, s in enumerate(strokes)
    ])


def test_scoring_average_over_all_or_the_last_few():
    rounds = [_round([5] * 18), _round([4] * 18), _round([4] * 9)]
    assert dashboard.scoring_average(rounds) == (90 + 72 + 36) / 3
    assert dashboard.scoring_average(rounds, 2) == (72 + 36) / 2
    assert dashboard.scoring_average([]) is None


def test_scoring_average_change_reads_the_last_few_against_the_window():
    rounds = [_round([5] * 18), _round([5] * 18), _round([4] * 18)]
    # The last two average 81 against 84 over all three.
    assert dashboard.scoring_average_change(rounds, 2) == -3.0
    assert dashboard.scoring_average_change([]) is None


def test_score_mix_counts_classified_holes():
    mix = dashboard.score_mix([_round([3, 4, 4, 5])])
    assert mix["holes"] == 4
    assert mix["percentages"]["par"] == 50.0
    assert mix["percentages"]["birdie"] == 25.0
    assert mix["percentages"]["quad"] == 0.0


def test_change_verdict_reads_a_fall_as_good():
    assert dashboard.change_verdict(-1.2) == "good"
    assert dashboard.change_verdict(0.4) == "bad"
    assert dashboard.change_verdict(0.0) == "neutral"
    assert dashboard.change_verdict(None) is None
    # A figure that improves as it rises reads the other way.
    assert dashboard.change_verdict(2.1, lower_is_better=False) == "good"
    assert dashboard.change_verdict(-0.5, lower_is_better=False) == "bad"


def test_whs_window_matches_the_table():
    assert whs_window(2) == (0, 0.0)
    assert whs_window(3) == (1, -2.0)
    assert whs_window(40) == (8, 0.0)



def _dated(day, strokes=None):
    from datetime import datetime, time
    round_ = _round(strokes or [4] * 18)
    round_.date = datetime.combine(day, time(12))  # naive, as the database's dates come back
    return round_


def test_handicap_change_this_month_reads_from_the_last_round_before_the_first():
    from datetime import date
    rounds = [_dated(date(2026, 4, 18)), _dated(date(2026, 5, 2)), _dated(date(2026, 6, 3)), _dated(date(2026, 6, 15))]
    trend = [{"handicap_index": v} for v in (14.0, 13.6, 13.2, 12.4)]
    # The index after May 2 was 13.6; it is 12.4 now.
    assert dashboard.handicap_change_this_month(rounds, trend, date(2026, 6, 20)) == -1.2
    # Nothing before April began, so there is nothing to measure from.
    assert dashboard.handicap_change_this_month(rounds, trend, date(2026, 4, 20)) is None
    # No round this month yet: the index hasn't moved.
    assert dashboard.handicap_change_this_month(rounds, trend, date(2026, 7, 2)) == 0.0


def test_rounds_this_year_count_only_this_calendar_year():
    from datetime import date
    rounds = [_dated(date(2025, 12, 30)), _dated(date(2026, 3, 9)), _dated(date(2026, 6, 15)), _dated(date(2026, 6, 20))]
    assert dashboard.rounds_this_year(rounds, date(2026, 6, 21)) == 3
    assert dashboard.rounds_this_year(rounds, date(2027, 1, 2)) == 0


def test_handicap_change_is_the_move_this_month_with_its_verdict():
    from datetime import date
    rounds = [_dated(date(2026, 5, 20)), _dated(date(2026, 6, 3)), _dated(date(2026, 6, 14))]
    trend = [{"handicap_index": v} for v in (14.0, 13.2, 12.4)]
    assert dashboard.handicap_change(rounds, trend, date(2026, 6, 21)) == {"this_month": -1.6, "this_month_verdict": "good"}
    # Nothing played before the 1st: no move to report.
    assert dashboard.handicap_change(rounds[1:], trend[1:], date(2026, 6, 21)) == {
        "this_month": None, "this_month_verdict": None,
    }
