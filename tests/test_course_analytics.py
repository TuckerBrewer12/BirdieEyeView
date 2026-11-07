"""A player's analytics at one course come back typed, with the hero figures worked out."""

from datetime import datetime, timezone

from api.course_analytics_responses import course_analytics
from models import Course, Hole, HoleScore, Round

PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5]
COURSE = Course(id="c1", name="Half Moon Bay", holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)])


def _round(round_id, day, over):
    """A round `over` strokes over par: one extra shot on each of the first `over` holes."""
    return Round(
        id=round_id,
        course=COURSE,
        date=datetime(2026, 5, day, tzinfo=timezone.utc),
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=p + (1 if i < over else 0), putts=2, green_in_regulation=i % 2 == 0)
            for i, p in enumerate(PARS)
        ],
    )


def test_hero_figures_and_history_come_from_the_rounds():
    rounds = [_round("r1", 1, 6), _round("r2", 8, 0), _round("r3", 15, 3)]  # oldest first
    response = course_analytics("c1", rounds)

    assert response.rounds_played == 3
    assert response.scoring_average == 75.0
    assert (response.best_score, response.worst_score) == (72, 78)
    assert [r.id for r in response.rounds] == ["r3", "r2", "r1"]
    assert [row.total_score for row in response.score_trend_on_course] == [78, 72, 75]
    assert [row.to_par for row in response.score_trend_on_course] == [6, 0, 3]
    # The score trend's average and par come from here, so the chart only draws them.
    assert [row.par for row in response.score_trend_on_course] == [72, 72, 72]
    assert [row.rolling_average for row in response.score_trend_on_course] == [78.0, 75.0, 75.0]
    assert response.recent_average == 75.0
    assert response.recent_average_change is None  # under ten scored rounds


def test_best_round_id_names_the_newest_round_on_the_best_score():
    rounds = [_round("r1", 1, 2), _round("r2", 8, 4), _round("r3", 15, 2)]  # oldest first
    response = course_analytics("c1", rounds)

    assert (response.best_score, response.best_round_id) == (74, "r3")


def test_recent_average_change_reads_the_last_five_against_the_first_five():
    overs = [8, 6, 7, 5, 9, 4, 3, 5, 2, 1]  # first five average 7 over, last five 3
    rounds = [_round(f"r{i}", i + 1, over) for i, over in enumerate(overs)]
    response = course_analytics("c1", rounds)

    assert response.recent_average == 75.0
    assert response.recent_average_change == -4.0


def test_per_hole_rows_are_typed():
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])

    first = response.average_score_relative_to_par_by_hole[0]
    assert (first.hole_number, first.par, first.average_to_par, first.sample_size) == (1, 4, 0.5, 2)
    assert response.gir_percentage_by_hole[0].gir_percentage == 100.0
    assert response.average_putts_by_hole[0].average_putts == 2.0
    mix = response.score_type_distribution_by_hole[0]
    assert (mix.par, mix.bogey) == (50.0, 50.0)
    assert response.course_difficulty_profile_by_hole[0].difficulty_rank == 1
    assert {row.bucket for row in response.average_score_when_gir_vs_missed} == {"GIR", "No GIR"}


def test_no_rounds_leaves_the_figures_empty():
    response = course_analytics("c1", [])
    assert response.rounds_played == 0
    assert response.scoring_average is None
    assert response.best_score is None
    assert response.rounds == []


def test_scorecard_nines_sum_the_per_hole_averages():
    # r1 is a stroke over on holes 1-2, r2 is level: holes 1 and 2 average half a stroke over.
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])
    front, back = sum(PARS[:9]), sum(PARS[9:])
    assert response.hole_averages_front_nine == front + 1.0
    assert response.hole_averages_back_nine == back
    assert response.hole_averages_total == front + back + 1.0


def test_scorecard_nines_are_null_for_a_nine_not_played():
    front_only = Round(
        id="r1", course=COURSE, date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        hole_scores=[HoleScore(hole_number=i + 1, strokes=p) for i, p in enumerate(PARS[:9])],
    )
    response = course_analytics("c1", [front_only])
    assert response.hole_averages_front_nine == sum(PARS[:9])
    assert response.hole_averages_back_nine is None
    assert response.hole_averages_total == sum(PARS[:9])
    assert course_analytics("c1", []).hole_averages_total is None
