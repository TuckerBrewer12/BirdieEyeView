"""Metric contracts: unknown vs zero, denominators, definitions, par authority, formats."""

from datetime import datetime, timedelta, timezone

import pytest

from analytics import stats
from analytics.handicap import course_handicap, round_half_up, round_rating
from models import Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND
from tests.analytics_builders import PARS_18, course, par_round, round_


# ================================================================
# Unknown is never zero
# ================================================================


def test_unknown_gir_is_neither_a_hit_nor_a_miss():
    r = round_({1: {"strokes": 4, "green_in_regulation": True}, 2: {"strokes": 4}, 3: {"strokes": 4}},
               course_obj=course(18))

    result = stats.overall_gir_percentage([r])

    assert (result["holes_played"], result["total_gir"], result["total_missed_gir"]) == (1, 1, 0)
    assert result["gir_percentage"] == 100.0
    assert stats.overall_gir_percentage([round_({1: {"strokes": 4}})])["gir_percentage"] is None


def test_putts_per_gir_uses_the_same_denominator_per_round_and_overall():
    r = round_({1: {"strokes": 4, "green_in_regulation": True, "putts": 2},
                2: {"strokes": 4, "green_in_regulation": True}}, course_obj=course(18))

    assert stats.putts_per_gir([r])[0]["putts_per_gir"] == 2.0
    assert stats.overall_putts_per_gir([r])["putts_per_gir"] == 2.0


def test_three_putts_are_unknown_without_putt_observations():
    row = stats.three_putts_per_round([round_({1: {"strokes": 4}})])[0]

    assert (row["three_putt_count"], row["three_putt_percentage"], row["holes_with_putt_data"]) == (None, None, 0)


def test_comparison_reports_window_size_and_observations():
    rows = [{"round_id": "a", "v": 1.0}, {"round_id": "b", "v": None}]

    window = stats.metric_comparison_snapshot(rows, primary_key="v", windows=(5,))[1]

    assert (window["sample_size"], window["observations"], window["primary_value"]) == (2, 1, 1.0)


def test_average_putts_by_hole_keeps_observed_holes():
    r = round_({1: {"strokes": 4, "putts": 2}, 2: {"strokes": 4}}, course_obj=course(18))

    assert [(row["hole_number"], row["average_putts"]) for row in stats.average_putts_by_hole([r])] == [(1, 2.0)]


def test_distributions_without_observations_are_unknown():
    row = stats.score_type_distribution_per_round([round_({1: {"strokes": 4}})])[0]

    assert row["holes_counted"] == 0 and row["par"] is None


# ================================================================
# Definitions
# ================================================================


def test_scrambling_counts_par_or_better_and_works_without_a_linked_course():
    r = round_({1: {"strokes": 3, "par_played": 4, "green_in_regulation": False},
                2: {"strokes": 5, "par_played": 4, "green_in_regulation": False}})

    row = stats.scrambling_per_round([r])[0]

    assert (row["scramble_opportunities"], row["scramble_successes"]) == (2, 1)


def test_up_and_down_needs_one_putt_and_par_or_better():
    r = round_({
        1: {"strokes": 4, "par_played": 4, "putts": 1, "green_in_regulation": False},  # chip, putt: yes
        2: {"strokes": 5, "par_played": 4, "putts": 1, "green_in_regulation": False},  # two chips, putt: no
        3: {"strokes": 4, "par_played": 4, "putts": 2, "green_in_regulation": False},  # two putts: no
    })

    row = stats.up_and_down_trend([r])[0]

    assert (row["opportunities"], row["successes"]) == (3, 1)


def test_overall_rates_weight_every_opportunity_equally():
    one_of_one = round_({1: {"strokes": 4, "par_played": 4, "green_in_regulation": False}}, round_id="a")
    zero_of_nine = round_({n: {"strokes": 6, "par_played": 4, "green_in_regulation": False} for n in range(1, 10)},
                          round_id="b")

    result = stats.overall_scrambling([one_of_one, zero_of_nine])

    assert (result["successes"], result["opportunities"]) == (1, 10)
    assert result["percentage"] == pytest.approx(10.0)
    assert stats.overall_scrambling([round_({1: {"strokes": 4}})])["percentage"] is None


def test_hole_consistency_ranks_only_holes_with_three_scores():
    rounds = [round_({1: {"strokes": s, "par_played": 4}, 2: {"strokes": 4, "par_played": 4}}, round_id=str(i))
              for i, s in enumerate([3, 5, 7])]
    rounds.append(round_({3: {"strokes": 9, "par_played": 4}}, round_id="once"))

    rows = {row["hole_number"]: row for row in stats.score_variance_by_hole(rounds)}

    assert (rows[1]["variance_rank"], rows[2]["variance_rank"], rows[3]["variance_rank"]) == (1, 2, None)


def test_selected_tee_missing_from_course_has_unknown_yardage():
    c = course(18).model_copy(update={"tees": [Tee(color="Blue", hole_yardages={n: 400 for n in FULL_ROUND})]})
    red = par_round(course_obj=c, tee_box="Red")
    unselected = par_round(course_obj=c)

    assert stats.scoring_by_yardage_buckets([red]) == []
    assert stats.scoring_by_yardage_buckets([unselected]) != []


# ================================================================
# Par and course authority
# ================================================================


def test_hole_handicap_scoring_survives_a_course_missing_a_hole():
    c = course(18).model_copy(update={"holes": [h for h in course(18).holes if h.number != 1]})
    r = round_({1: {"strokes": 5, "par_played": 4}, 2: {"strokes": 4}}, course_obj=c)

    rows = stats.scoring_vs_hole_handicap([r])

    assert [row["handicap"] for row in rows] == [2]


def test_per_hole_stats_use_the_par_played_without_a_course():
    r = round_({1: {"strokes": 5, "par_played": 4}})

    assert stats.average_score_relative_to_par_by_hole([r])[0]["average_to_par"] == 1
    assert stats.average_score_when_gir_vs_missed([round_({1: {"strokes": 5, "par_played": 4,
                                                             "green_in_regulation": False}})])[1]["holes_counted"] == 1


# ================================================================
# Formats and round totals
# ================================================================


def test_nine_and_eighteen_hole_rounds_combine_in_hole_level_stats():
    nine = round_({n: {"strokes": 4, "green_in_regulation": True} for n in FRONT_NINE}, course_obj=course(9))
    eighteen = round_({n: {"strokes": 4, "green_in_regulation": False} for n in FULL_ROUND}, course_obj=course(18))

    result = stats.overall_gir_percentage([nine, eighteen])

    assert (result["holes_played"], result["total_gir"]) == (27, 9)


def test_score_trend_totals_only_complete_rounds_and_marks_format():
    partial = par_round(holes=[1, 2], course_obj=course(18), round_id="partial")
    nine = par_round(holes=FRONT_NINE, course_obj=course(9), round_id="nine")

    rows = stats.score_trend([partial, nine])

    assert (rows[0]["total_score"], rows[0]["holes"]) == (None, 18)
    assert (rows[1]["total_score"], rows[1]["to_par"], rows[1]["holes"]) == (36, 0, 9)


def test_net_score_trend_follows_completeness_and_score_trend_to_par():
    rated = course(18, rating=72.0, slope=113)
    partial = par_round(holes=FRONT_NINE, course_obj=rated, tee_box="Blue", round_id="partial")
    full = par_round(over=9, course_obj=rated, tee_box="Blue", round_id="full")

    rows = stats.net_score_trend([partial, full], 10.0)

    assert (rows[0]["net_score"], rows[0]["to_par"]) == (None, None)
    assert (rows[1]["course_handicap"], rows[1]["net_score"], rows[1]["to_par"]) == (10, 71, 9)


# ================================================================
# Ratings and course handicap
# ================================================================


def test_rating_without_coverage_covers_the_course_layout_only():
    rated = course(18, rating=72.0, slope=130)
    full = par_round(course_obj=rated, tee_box="Blue")
    front = par_round(holes=FRONT_NINE, course_obj=rated, tee_box="Blue", intended=FRONT_NINE)

    assert round_rating(full) == (72.0, 130)
    assert round_rating(front) is None  # no made-up nine-hole rating


def test_course_handicap_rounds_half_up_and_halves_the_index_for_nine_holes():
    nine = par_round(holes=FRONT_NINE, course_obj=course(9, rating=35.0, slope=113), tee_box="Blue")

    assert round_half_up(16.95, 1) == 17.0
    assert round_half_up(2.5) == 3.0
    assert course_handicap(9.0, nine) == 4  # 4.5 + (35 - 36) = 3.5 -> 4


# ================================================================
# Achievements
# ================================================================


def test_a_partial_round_is_never_a_record_or_break():
    one_hole = round_({1: {"strokes": 4}}, course_obj=course(18), round_id="partial")

    summary = stats.notable_achievements([one_hole], reference_date=datetime(2026, 6, 1))

    assert summary["scoring_records"]["lifetime"]["lowest_round"] is None
    breaks = {row["threshold"]: row["achievement"] for row in summary["round_milestones"]["lifetime"]["score_breaks"]}
    assert breaks[60] is None
    assert summary["career_totals"]["lifetime"]["total_holes_played"] == 1


def test_nine_hole_rounds_have_their_own_lowest_round():
    nine = par_round(holes=FRONT_NINE, course_obj=course(9), round_id="nine")
    eighteen = par_round(over=10, round_id="eighteen")

    records = stats.notable_achievements([nine, eighteen], reference_date=datetime(2026, 6, 1))["scoring_records"]

    assert records["lifetime"]["lowest_round"] == 82
    assert records["lifetime"]["lowest_round_nine"] == 36


def test_an_albatross_is_not_an_eagle():
    scores = {n: {"strokes": p} for n, p in PARS_18.items()} | {5: {"strokes": 2}}  # par 5 in two
    albatross = round_(scores, course_obj=course(18))

    summary = stats.notable_achievements([albatross], reference_date=datetime(2026, 6, 1))

    totals = summary["career_totals"]["lifetime"]
    assert (totals["total_eagles"], totals["total_albatrosses"]) == (0, 1)
    assert summary["round_milestones"]["lifetime"]["first_eagle"] is None


def test_first_round_under_par_keeps_its_round_id():
    under = par_round(over=-1, round_id="under")

    event = stats.notable_achievements([under], reference_date=datetime(2026, 6, 1))["round_milestones"]["lifetime"][
        "first_round_under_par"
    ]

    assert (event["score"], event["round_id"]) == (71, "under")


def test_window_handles_mixed_dates_time_of_day_and_future_rounds():
    reference = datetime(2026, 6, 1, 12)
    aware = par_round(round_id="aware", date=datetime(2026, 5, 1, tzinfo=timezone.utc))
    just_inside = par_round(over=-1, round_id="inside", date=reference - timedelta(days=365) + timedelta(hours=2))
    future = par_round(over=-2, round_id="future", date=reference + timedelta(days=3))

    summary = stats.notable_achievements([aware, just_inside, future], reference_date=reference)

    assert summary["career_totals"]["one_year"]["rounds_played"] == 2
    assert "first_round_under_par" in summary["round_milestones"]["one_year"]["new_personal_records_achieved"]


def test_streaks_follow_dates_not_input_order():
    early = round_({n: {"strokes": PARS_18[n] - 1} for n in (16, 17, 18)}, course_obj=course(18),
                   round_id="early", date=datetime(2026, 1, 1))
    late = round_({n: {"strokes": PARS_18[n] - 1} for n in (1, 2)}, course_obj=course(18),
                  round_id="late", date=datetime(2026, 1, 2))

    forward = stats.notable_achievements([early, late], reference_date=datetime(2026, 6, 1))
    backward = stats.notable_achievements([late, early], reference_date=datetime(2026, 6, 1))

    assert forward["best_performance_streaks"] == backward["best_performance_streaks"]
    assert forward["best_performance_streaks"]["lifetime"]["longest_birdie_streak"] == 5


# ================================================================
# Review follow-ups
# ================================================================


def test_comparisons_only_average_complete_rounds_of_the_same_format():
    nine = par_round(holes=FRONT_NINE, course_obj=course(9), over=9, round_id="nine", date=datetime(2026, 1, 1))
    eighteen = par_round(over=18, round_id="eighteen", date=datetime(2026, 1, 2))

    window = stats.score_comparison([nine, eighteen])[1]

    assert (window["primary_value"], window["observations"]) == (90, 1)  # not (90 + 45) / 2


def test_putt_comparisons_skip_incomplete_rounds():
    full = round_({n: {"strokes": 4, "putts": 2} for n in FULL_ROUND}, course_obj=course(18), round_id="full")
    one_hole = round_({1: {"strokes": 4, "putts": 2}}, course_obj=course(18), round_id="partial")

    window = stats.putts_comparison([one_hole, full])[1]

    assert window["primary_value"] == 36  # not (36 + 2) / 2


def test_course_trend_handles_mixed_timezone_awareness():
    aware = par_round(round_id="aware", date=datetime(2026, 1, 2, tzinfo=timezone.utc))
    naive = par_round(round_id="naive", date=datetime(2026, 1, 1))

    rows = stats.score_trend_on_this_course([aware, naive])

    assert [row["round_id"] for row in rows] == ["naive", "aware"]


def test_a_combo_tee_never_borrows_a_prefix_match():
    c = course(18).model_copy(update={"tees": [Tee(color="Blue", hole_yardages={n: 400 for n in FULL_ROUND})]})
    combo = par_round(course_obj=c, tee_box="Blue/White")
    label_variant = par_round(course_obj=c, tee_box="Blue tees")

    assert stats.scoring_by_yardage_buckets([combo]) == []
    assert stats.scoring_by_yardage_buckets([label_variant]) != []


def test_round_records_need_the_observations_they_count():
    no_putts = par_round(round_id="no-putts")  # complete, every putt unknown
    no_pars = round_({n: {"strokes": 3} for n in FULL_ROUND}, round_id="no-pars", intended=FULL_ROUND,
                     date=datetime(2025, 1, 1))  # earlier, so it would win a 0-birdie tie if it counted

    summary = stats.notable_achievements([no_putts, no_pars], reference_date=datetime(2026, 6, 1))

    putting = summary["putting_milestones"]["lifetime"]
    assert (putting["most_1_putts_in_round"], putting["most_3_putts_in_round"]) == (None, None)
    assert summary["putting_milestones_events"]["lifetime"]["most_1_putts_in_round"] is None
    records = summary["scoring_records"]["lifetime"]
    assert (records["most_birdies_in_round"], records["most_eagles_in_round"]) == (0, 0)  # only no-putts has pars
    assert summary["scoring_records_events"]["lifetime"]["most_birdies_in_round"]["round_id"] == "no-putts"


def test_per_hole_gir_and_putts_do_not_need_par():
    r = round_({1: {"strokes": 4, "green_in_regulation": True, "putts": 2}})  # no course, no par played

    gir = stats.gir_percentage_by_hole([r])
    putts = stats.average_putts_by_hole([r])

    assert [(row["hole_number"], row["gir_percentage"], row["par"]) for row in gir] == [(1, 100.0, None)]
    assert [(row["hole_number"], row["average_putts"]) for row in putts] == [(1, 2.0)]
