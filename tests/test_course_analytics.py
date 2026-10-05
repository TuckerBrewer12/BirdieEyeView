"""A player's analytics at one course come back typed, with the hero figures worked out."""

from datetime import datetime

from api.course_analytics_responses import course_analytics
from models import Course, Hole, HoleScore, Round

PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5]
COURSE = Course(id="c1", name="Half Moon Bay", holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)])


def _round(round_id, day, over):
    """A round `over` strokes over par: one extra shot on each of the first `over` holes."""
    return Round(
        id=round_id,
        course=COURSE,
        date=datetime(2026, 5, day),
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
