"""The analytics page's insights: which facts the rounds support, which way each points, and how good an average is."""

import pytest

from analytics.insights import gir_rating, insights, putts_rating


def _scores(*scores):
    return [{"round_index": i + 1, "total_score": s} for i, s in enumerate(scores)]


def _gir(*rates):
    return [{"round_index": i + 1, "gir_percentage": r} for i, r in enumerate(rates)]


def _putts(*counts):
    return [{"round_index": i + 1, "total_putts": c} for i, c in enumerate(counts)]


def test_notices_scores_coming_down_between_the_two_halves():
    assert insights(_scores(90, 90, 90, 80, 80, 80), [], [], []) == [
        {"kind": "scoring_shift", "category": "scoring", "trend": "down", "strokes": 10, "rounds": 6},
    ]


def test_a_climbing_scoring_average_points_up():
    [shift] = insights(_scores(80, 80, 80, 82, 82, 82), [], [], [])
    assert shift["trend"] == "up"
    assert shift["strokes"] == pytest.approx(-2)


def test_splits_the_rounds_before_skipping_unscored_ones():
    # Halves are [90, None, 90] and [80, 80, 80]; the unscored round doesn't move the split.
    [shift] = insights(_scores(90, None, 90, 80, 80, 80), [], [], [])
    assert shift["strokes"] == 10
    assert shift["rounds"] == 6


def test_stays_quiet_about_scoring_under_six_rounds_or_a_shift_under_three_tenths():
    assert insights(_scores(90, 80, 70), [], [], []) == []
    assert insights(_scores(80, 80, 80, 80, 80, 80.2), [], [], []) == []


def test_picks_the_par_type_played_best():
    by_par = [
        {"par": 3, "average_to_par": 0.6, "average_strokes": 3.6, "sample_size": 20},
        {"par": 5, "average_to_par": 0.1, "average_strokes": 5.1, "sample_size": 12},
    ]
    assert insights([], [], by_par, []) == [
        {"kind": "best_par", "category": "scoring", "trend": "flat", "par": 5, "average_to_par": 0.1, "holes": 12},
    ]
    under = [{"par": 4, "average_to_par": -0.2, "average_strokes": 3.8, "sample_size": 9}]
    assert insights([], [], under, [])[0]["trend"] == "down"


def test_averages_gir_and_putts_over_the_rounds_that_have_them_and_spots_their_shifts():
    found = insights([], _gir(20, None, 20, 40, 40), [], _putts(36, 36, None, 32, 32))
    assert found == [
        {"kind": "gir_average", "category": "gir", "trend": "flat", "rating": "weak", "percent": 30},
        {"kind": "gir_shift", "category": "gir", "trend": "up", "points": 20},
        {"kind": "putts_average", "category": "putting", "trend": "flat", "rating": "fair", "putts": 34},
        {"kind": "putts_shift", "category": "putting", "trend": "down", "putts": 4},
    ]


def test_leaves_out_gir_and_putts_shifts_too_small_or_on_too_few_rounds():
    assert [i["kind"] for i in insights([], _gir(30, 30, 30.5, 30.5), [], _putts(33, 33, 33.4, 33.4))] == [
        "gir_average",
        "putts_average",
    ]
    assert [i["kind"] for i in insights([], _gir(10, 60, 60), [], _putts(40, 30, 30))] == [
        "gir_average",
        "putts_average",
    ]


def test_rising_putts_point_up():
    shift = insights([], [], [], _putts(30, 30, 33, 33))[-1]
    assert shift == {"kind": "putts_shift", "category": "putting", "trend": "up", "putts": -3}


def test_the_gir_average_points_up_from_half_the_greens():
    assert insights([], _gir(50), [], [])[0]["trend"] == "up"
    assert insights([], _gir(49), [], [])[0]["trend"] == "flat"


def test_the_putts_average_points_down_when_low_and_up_when_high():
    trend = lambda putts: insights([], [], [], _putts(putts))[0]["trend"]  # noqa: E731
    assert (trend(32), trend(33), trend(36), trend(37)) == ("down", "flat", "flat", "up")


@pytest.mark.parametrize(("percent", "rating"), [(55, "strong"), (54.9, "fair"), (33, "fair"), (32.9, "weak")])
def test_gir_rating(percent, rating):
    assert gir_rating(percent) == rating


@pytest.mark.parametrize(("putts", "rating"), [(30, "strong"), (30.1, "fair"), (34, "fair"), (34.1, "weak")])
def test_putts_rating(putts, rating):
    assert putts_rating(putts) == rating


def test_nothing_to_say_without_rounds():
    assert insights([], [], [], []) == []
