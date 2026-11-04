"""Goal engine on real rounds (no patched collaborators), with hand-worked expectations."""

import pytest

import analytics.goals as goals
from models import Round
from models.hole_layout import FRONT_NINE, FULL_ROUND
from tests.analytics_builders import PARS_18, course, par_round, round_


def missed_every_green(round_id="r", *, over=1, putts=2):
    """Complete 18-hole round: every green missed, every hole ``over`` par with ``putts`` putts."""
    return round_({n: {"strokes": PARS_18[n] + over, "green_in_regulation": False, "putts": putts}
                   for n in FULL_ROUND}, course_obj=course(18), round_id=round_id)


def by_type(report):
    return {saver["type"]: saver for saver in report["savers"]}


def test_goal_report_without_scores_returns_empty_report():
    assert goals.goal_report([Round()], 85) == {
        "scoring_average": None,
        "best_score": None,
        "scoring_goal": 85,
        "gap": None,
        "on_track": False,
        "savers": [],
    }


def test_eighteen_hole_goal_uses_only_complete_eighteen_hole_rounds():
    rounds = [
        par_round(over=18, round_id="a"),
        par_round(over=20, round_id="b"),
        par_round(holes=[1, 2], course_obj=course(18), round_id="partial"),
        par_round(holes=FRONT_NINE, course_obj=course(9), round_id="nine"),
    ]

    report = goals.goal_report(rounds, 85)

    assert (report["scoring_average"], report["best_score"], report["gap"], report["on_track"]) == (91.0, 90, 6.0, False)
    assert "nine_hole" not in report


def test_nine_hole_goal_has_its_own_summary():
    rounds = [par_round(over=18), par_round(holes=FRONT_NINE, course_obj=course(9), over=6, round_id="nine")]

    report = goals.goal_report(rounds, 85, scoring_goal_nine=44)

    assert report["nine_hole"] == {"scoring_average": 42.0, "best_score": 42, "scoring_goal": 44, "gap": -2.0,
                                   "on_track": True}


def test_a_gap_that_shows_as_zero_is_on_track():
    rounds = [par_round(over=13, round_id=str(i)) for i in range(24)] + [par_round(over=14, round_id="x")]

    report = goals.goal_report(rounds, 85)  # average 85.04

    assert (report["gap"], report["on_track"]) == (0.0, True)
    assert all(saver["percentage_of_gap"] == 0.0 for saver in report["savers"])


def test_measured_zero_gir_is_not_replaced_by_a_default():
    report = goals.goal_report([missed_every_green()], 70)  # 90 vs 70

    savers = by_type(report)
    # 0% GIR: 45 points below, capped at 30 points -> 3 x 0.6 = 1.8.
    assert savers["gir_opportunity"]["strokes_saved"] == 1.8
    # 0% scrambling on 18 observed missed greens: +15 points x 18 = 2.7 (not 12.06 inferred misses).
    assert savers["scrambling_opportunity"]["strokes_saved"] == 2.7


def test_scrambling_uses_observed_missed_greens_per_round_not_eighteen():
    nine_missed = round_({n: {"strokes": PARS_18[n] + 1, "green_in_regulation": n <= 9} for n in FULL_ROUND},
                         course_obj=course(18))

    saver = by_type(goals.goal_report([nine_missed], 70))["scrambling_opportunity"]

    assert saver["strokes_saved"] == pytest.approx(1.35)  # 0.15 x 9 missed greens


def test_rounds_without_putts_on_every_hole_do_not_dilute_three_putts():
    three_putter = missed_every_green("a", putts=3)
    no_putts = round_({n: {"strokes": PARS_18[n] + 1} for n in FULL_ROUND}, course_obj=course(18), round_id="b")

    saver = by_type(goals.goal_report([three_putter, no_putts], 70))["three_putt_bleed"]

    assert saver["strokes_saved"] == 18.0
    assert "3+ putts" in saver["headline"]


def test_home_hole_needs_five_scores_of_that_hole():
    home = course(18, course_id="home")
    rounds = [par_round(course_obj=home, round_id=str(i)) for i in range(4)]
    rounds.append(round_({1: {"strokes": 8}}, course_obj=home, round_id="once"))  # hole 1 seen 5 times, others 4

    report = goals.goal_report([par_round(over=10)], 70, home_course_rounds=rounds)
    saver = by_type(report).get("home_course_demon")

    assert saver is not None and saver["data"] == {"hole_number": 1, "average_to_par": 0.8, "sample_size": 5}


def test_fractional_counts_keep_their_decimal_in_the_copy():
    triple = round_({n: {"strokes": PARS_18[n] + (3 if n == 1 else 0)} for n in FULL_ROUND},
                    course_obj=course(18), round_id="t")
    rounds = [triple] + [par_round(round_id=str(i)) for i in range(9)]

    saver = by_type(goals.goal_report(rounds, 70))["blowup_holes"]

    assert saver["strokes_saved"] == 0.2
    assert "0.1 triple-or-worse" in saver["detail"]


def test_on_track_savers_use_maintenance_copy():
    report = goals.goal_report([missed_every_green(putts=3)], 95)

    assert report["on_track"] is True
    assert "keep eliminating" in by_type(report)["three_putt_bleed"]["detail"]


def test_savers_are_ranked_by_strokes():
    savers = goals.goal_report([missed_every_green(putts=3)], 70)["savers"]

    assert savers == sorted(savers, key=lambda saver: saver["strokes_saved"], reverse=True)
    assert all(saver["strokes_saved"] >= goals.MIN_SAVER_STROKES for saver in savers)
