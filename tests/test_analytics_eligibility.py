from datetime import datetime, timedelta, timezone

from analytics import eligibility as el
from models.hole_layout import FRONT_NINE, FULL_ROUND
from tests.analytics_builders import course, par_round, round_


def test_complete_rounds_exclude_partial_rounds():
    full = par_round(round_id="full")
    partial = par_round(holes=[1, 2, 3], course_obj=course(18), round_id="partial")

    assert [r.id for r in el.complete_rounds([full, partial])] == ["full"]


def test_rounds_are_grouped_by_format_without_doubling():
    eighteen = par_round(round_id="eighteen")
    nine = par_round(holes=FRONT_NINE, course_obj=course(9), round_id="nine")
    back_nine = par_round(holes=range(10, 19), course_obj=course(18), intended=range(10, 19), round_id="back")

    grouped = el.by_format([eighteen, nine, back_nine])

    assert [r.id for r in grouped[18]] == ["eighteen"]
    assert [r.id for r in grouped[9]] == ["nine", "back"]
    assert nine.calculate_total_score() == 36  # never scaled


def test_scored_holes_skip_unread_and_unplayed_holes():
    r = round_({1: {"strokes": 4}, 2: {}, 3: {"played": False}}, course_obj=course(18))

    assert [s.hole_number for s in el.scored_holes(r)] == [1]


def test_hole_par_prefers_the_par_played():
    r = round_({1: {"strokes": 4, "par_played": 5}}, course_obj=course(18))

    assert el.hole_par(r, 1) == 5
    assert el.hole_par(round_({1: {"strokes": 4}}), 1) is None  # unlinked, no par recorded


def test_hole_handicap_prefers_the_handicap_played_then_the_course():
    r = round_({1: {"strokes": 4, "handicap_played": 9}, 2: {"strokes": 4}}, course_obj=course(18))

    assert (el.hole_handicap(r, 1), el.hole_handicap(r, 2)) == (9, 2)


def test_a_rate_without_opportunities_is_unknown():
    assert el.Rate(0, 0).percentage is None
    assert el.Rate(0, 4).percentage == 0.0
    assert el.Rate(1, 4).ratio == 0.25


def test_chronological_handles_aware_naive_and_undated_rounds():
    aware = par_round(date=datetime(2026, 1, 2, tzinfo=timezone(timedelta(hours=-8))), round_id="aware")
    naive = par_round(date=datetime(2026, 1, 2, 12), round_id="naive")
    undated = par_round(date=None, round_id="undated")

    ordered = el.chronological([undated, aware, naive])

    assert [r.id for r in ordered] == ["aware", "naive", "undated"]


def test_round_format_is_unknown_without_intended_holes():
    assert el.round_format(round_({1: {"strokes": 4}})) is None
    assert el.round_format(par_round()) == 18
    assert el.round_format(par_round(holes=FULL_ROUND)) == 18
