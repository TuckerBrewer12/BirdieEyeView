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


def test_recent_form_pools_by_chance_and_is_null_without_data():
    form = dashboard.recent_form([_round([4] * 18, gir=True), _round([5] * 18, gir=False)])
    assert form["gir_pct"] == 50.0
    assert form["putts_per_18"] == 36.0

    empty = dashboard.recent_form([Round(hole_scores=[HoleScore(hole_number=1, strokes=4)])])
    assert empty["gir_pct"] is None
    assert empty["putts_per_18"] is None


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
            "first_round_under_par": {"score": 71, "date": "2026-05-02T00:00:00", "course": "Blue Rock"},
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
