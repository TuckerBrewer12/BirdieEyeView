"""The analytics page's insights: which facts the rounds support, which way each points, and how good an average is."""

import pytest

from analytics.insights import gir_rating, insights, putts_rating
from models import HoleScore, Round


def _round(score=72, greens=None, putts=None):
    """Eighteen holes adding up to `score` (none scored when null), `greens` as (hit, of the holes
    that recorded it), and `putts` spread over the holes."""
    strokes = [None] * 18 if score is None else [score // 18 + (1 if i < score % 18 else 0) for i in range(18)]
    hit, recorded = greens or (0, 0)
    return Round(hole_scores=[
        HoleScore(
            hole_number=i + 1,
            strokes=strokes[i],
            putts=None if putts is None else putts // 18 + (1 if i < putts % 18 else 0),
            green_in_regulation=(i < hit) if i < recorded else None,
        )
        for i in range(18)
    ])


def _scored(*scores):
    return [_round(score) for score in scores]


def test_notices_scores_coming_down_between_the_two_halves():
    assert insights(_scored(90, 90, 90, 80, 80, 80), []) == [
        {"kind": "scoring_shift", "category": "scoring", "trend": "down", "strokes": 10.0, "rounds": 6},
    ]


def test_a_climbing_scoring_average_points_up():
    [shift] = insights(_scored(80, 80, 80, 82, 82, 82), [])
    assert shift["trend"] == "up"
    assert shift["strokes"] == -2.0


def test_splits_the_rounds_before_skipping_unscored_ones():
    # Halves are [90, None, 90] and [80, 80, 80]; the unscored round doesn't move the split.
    [shift] = insights(_scored(90, None, 90, 80, 80, 80), [])
    assert shift["strokes"] == 10.0
    assert shift["rounds"] == 6


def test_stays_quiet_about_scoring_under_six_rounds_or_a_shift_under_three_tenths():
    assert insights(_scored(90, 80, 70), []) == []
    # 80.0 against 80.2: the two scoring averages as they're shown.
    assert insights(_scored(*([80] * 9 + [81])), []) == []


def test_picks_the_par_type_played_best():
    by_par = [
        {"par": 3, "average_to_par": 0.6, "average_strokes": 3.6, "sample_size": 20},
        {"par": 5, "average_to_par": 0.1, "average_strokes": 5.1, "sample_size": 12},
    ]
    assert insights([], by_par) == [
        {"kind": "best_par", "category": "scoring", "trend": "flat", "par": 5, "average_to_par": 0.1, "holes": 12},
    ]
    under = [{"par": 4, "average_to_par": -0.2, "average_strokes": 3.8, "sample_size": 9}]
    assert insights([], under)[0]["trend"] == "down"


def test_pools_gir_and_averages_putts_over_the_rounds_that_have_them_and_spots_their_shifts():
    rounds = [
        _round(greens=(2, 10), putts=36),
        _round(putts=36),
        _round(greens=(2, 10)),
        _round(greens=(4, 10), putts=32),
        _round(greens=(4, 10), putts=32),
    ]
    assert insights(rounds, []) == [
        {"kind": "gir_average", "category": "gir", "trend": "flat", "rating": "weak", "percent": 30.0},
        {"kind": "gir_shift", "category": "gir", "trend": "up", "points": 20.0},
        {"kind": "putts_average", "category": "putting", "trend": "flat", "rating": "fair", "putts": 34.0},
        {"kind": "putts_shift", "category": "putting", "trend": "down", "putts": 4.0},
    ]


def test_gir_pools_the_holes_that_recorded_it_rather_than_averaging_each_rounds_rate():
    # 2 of 2 and 0 of 18 average 50% a round, but are 2 greens of 20.
    [average] = insights([_round(greens=(2, 2)), _round(greens=(0, 18))], [])
    assert average["percent"] == 10.0


def test_leaves_out_gir_and_putts_shifts_too_small_or_on_too_few_rounds():
    small = [_round(greens=(3, 10), putts=p) for p in (33, 33, 33, 33)] + [_round(greens=(5, 17), putts=34)]
    assert [i["kind"] for i in insights(small, [])] == ["gir_average", "putts_average"]
    few = [_round(greens=(1, 10), putts=40), _round(greens=(6, 10), putts=30), _round(greens=(6, 10), putts=30)]
    assert [i["kind"] for i in insights(few, [])] == ["gir_average", "putts_average"]


def test_rising_putts_point_up():
    shift = insights([_round(putts=p) for p in (30, 30, 33, 33)], [])[-1]
    assert shift == {"kind": "putts_shift", "category": "putting", "trend": "up", "putts": -3.0}


def test_the_gir_average_points_up_from_half_the_greens():
    assert insights([_round(greens=(5, 10))], [])[0]["trend"] == "up"
    assert insights([_round(greens=(4, 10))], [])[0]["trend"] == "flat"


def test_the_putts_average_points_down_when_low_and_up_when_high():
    def trend(putts):
        return insights([_round(putts=putts)], [])[0]["trend"]

    assert (trend(32), trend(33), trend(36), trend(37)) == ("down", "flat", "flat", "up")


@pytest.mark.parametrize(("percent", "rating"), [(55, "strong"), (54.9, "fair"), (33, "fair"), (32.9, "weak")])
def test_gir_rating(percent, rating):
    assert gir_rating(percent) == rating


@pytest.mark.parametrize(("putts", "rating"), [(30, "strong"), (30.1, "fair"), (34, "fair"), (34.1, "weak")])
def test_putts_rating(putts, rating):
    assert putts_rating(putts) == rating


def test_nothing_to_say_without_rounds():
    assert insights([], []) == []
