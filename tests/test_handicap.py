from datetime import datetime

import pytest

import analytics.handicap as handicap
from models import Round
from tests.helpers import make_scoring_round


def test_score_differential_uses_course_and_slope_rating():
    assert handicap.score_differential(90, 72.0, 113.0) == 18.0


def test_rated_round_produces_differential_row():
    rows = handicap.score_differentials_per_round([make_scoring_round(90, rated=True)])

    assert (
        rows[0]["differential"],
        rows[0]["course_rating"],
        rows[0]["slope_rating"],
    ) == (18.0, 72.0, 113.0)


@pytest.mark.parametrize(
    "round_",
    [make_scoring_round(45, rated=True, holes=9), Round(id="empty")],
)
def test_incomplete_round_has_no_score_differential(round_):
    row = handicap.score_differentials_per_round([round_])[0]

    assert row["differential"] is None


def test_unrated_round_uses_par_fallback():
    assert handicap._get_differential_for_round(make_scoring_round(90)) == 18.0


def test_nine_hole_rounds_are_not_used_yet():
    # The WHS nine-hole method needs an expected score; until then nine-hole rounds don't count.
    assert handicap._get_differential_for_round(make_scoring_round(45, holes=9)) is None


def test_partial_round_rejects_full_round_par():
    round_ = make_scoring_round(45, holes=9)
    for score in round_.hole_scores:
        score.par_played = 6

    assert handicap._get_differential_for_round(round_) is None


def test_partial_round_without_par_has_no_differential():
    round_ = make_scoring_round(45, holes=9, par_played=None)

    assert handicap._get_differential_for_round(round_) is None


@pytest.fixture
def indexed_rounds(monkeypatch):
    rounds = [Round(id=str(index)) for index in range(20)]
    differentials = {str(index): float(index + 1) for index in range(20)}
    monkeypatch.setattr(
        handicap,
        "_get_differential_for_round",
        lambda item: differentials[item.id],
    )
    return rounds


@pytest.mark.parametrize(("round_count", "expected"), [(2, None), (3, -1.0), (20, 4.5)])
def test_handicap_index_applies_whs_table(indexed_rounds, round_count, expected):
    assert handicap.handicap_index(indexed_rounds[:round_count]) == expected


def test_handicap_index_caps_high_result(monkeypatch, indexed_rounds):
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: 80.0)

    assert handicap.handicap_index(indexed_rounds[:3]) == 54.0


def test_handicap_index_uses_seed_without_rounds():
    assert handicap.handicap_index([], seed_handicap=18.2) == 18.2


@pytest.fixture
def dated_rounds(monkeypatch):
    rounds = [
        Round(id="old-high", date=datetime(2025, 1, 1)),
        Round(id="old-low", date=datetime(2025, 1, 2)),
        Round(id="new-high", date=datetime(2025, 2, 1)),
    ]
    differentials = {"old-high": 20.0, "old-low": 10.0, "new-high": 22.0}
    monkeypatch.setattr(
        handicap,
        "_get_differential_for_round",
        lambda item: differentials[item.id],
    )
    return rounds


def eligible_values(rounds, **seed):
    options = {"seed_handicap": None, "transition_rounds": 10, "seed_set_at": None} | seed
    return [d.value for d in handicap._eligible(handicap._differentials(rounds), **options)]


def test_seed_handicap_filters_transition_rounds(dated_rounds):
    assert eligible_values(dated_rounds, seed_handicap=15.0, transition_rounds=2) == [10.0, 22.0]


def test_seed_handicap_honors_seed_date(dated_rounds):
    assert eligible_values(dated_rounds, seed_handicap=15.0, seed_set_at=datetime(2025, 1, 15)) == [10.0, 22.0]


@pytest.mark.parametrize(("round_slice", "expected"), [(slice(None, 1), 15.0), (slice(1, 2), 10.0)])
def test_seed_handicap_guides_early_index(dated_rounds, round_slice, expected):
    assert handicap.handicap_index(dated_rounds[round_slice], seed_handicap=15.0) == expected


def test_handicap_trend_calculates_rolling_index(monkeypatch):
    rounds = [Round(id=str(index)) for index in range(4)]
    differentials = {"0": 12.0, "1": 10.0, "2": 10.0, "3": 14.0}
    monkeypatch.setattr(
        handicap,
        "_get_differential_for_round",
        lambda item: differentials[item.id],
    )

    trend = handicap.handicap_trend(rounds)

    assert [entry["handicap_index"] for entry in trend] == [None, None, 8.0, 9.0]


def test_trend_marks_the_rounds_the_current_index_uses_preferring_recent_ties(monkeypatch):
    rounds = [Round(id=str(index)) for index in range(4)]
    differentials = {"0": 12.0, "1": 10.0, "2": 10.0, "3": 14.0}
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: differentials[item.id])

    trend = handicap.handicap_trend(rounds)

    assert [entry["used_in_hi"] for entry in trend] == [False, False, True, False]
    assert all(entry["hi_threshold"] == 10.0 for entry in trend)


def test_trend_with_short_history_marks_nothing(monkeypatch):
    rounds = [Round(id="a"), Round(id="b")]
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: {"a": None, "b": 8.0}[item.id])

    trend = handicap.handicap_trend(rounds)

    assert [(e["used_in_hi"], e["hi_threshold"]) for e in trend] == [(None, None), (False, None)]
