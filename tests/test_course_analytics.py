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


def test_record_and_history_come_from_the_rounds():
    rounds = [_round("r1", 1, 6), _round("r2", 8, 0), _round("r3", 15, 3)]  # oldest first
    response = course_analytics("c1", rounds)

    assert response.rounds_played == 3
    assert response.last_played.day == 15
    assert (response.scoring_average, response.scoring_average_to_par) == (75.0, 3.0)
    assert (response.best_round_id, response.worst_round_id) == ("r2", "r1")
    assert [r.id for r in response.rounds] == ["r3", "r2", "r1"]


def test_a_nine_stays_out_of_the_average_beside_full_rounds():
    nine = Round(
        id="n1", course=COURSE, date=datetime(2026, 5, 20, tzinfo=timezone.utc),
        hole_scores=[HoleScore(hole_number=i + 1, strokes=p) for i, p in enumerate(PARS[:9])],
    )
    response = course_analytics("c1", [_round("r1", 1, 6), nine])
    assert response.rounds_played == 2
    assert response.scoring_average == 78.0
    assert response.last_played.day == 20
    assert (response.best_round_id, response.worst_round_id) == ("r1", "r1")

    only_nines = course_analytics("c1", [nine])
    assert (only_nines.scoring_average, only_nines.scoring_average_to_par) == (36.0, 0.0)


def test_per_hole_rows_are_typed():
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])

    first = response.average_score_relative_to_par_by_hole[0]
    assert (first.hole_number, first.par, first.average_to_par, first.sample_size) == (1, 4, 0.5, 2)
    assert response.gir_percentage_by_hole[0].gir_percentage == 100.0


def test_no_rounds_leaves_the_figures_empty():
    response = course_analytics("c1", [])
    assert response.rounds_played == 0
    assert response.last_played is None
    assert response.scoring_average is None
    assert response.best_round_id is None
    assert response.rounds == []
    assert response.hole_to_par_total is None
    assert response.gir_total is None


def test_scorecard_nines_sum_the_per_hole_averages_to_par():
    # r1 is a stroke over on holes 1-2, r2 is level: holes 1 and 2 average half a stroke over.
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])
    assert response.hole_to_par_front_nine == 1.0
    assert response.hole_to_par_back_nine == 0.0
    assert response.hole_to_par_total == 1.0


def test_greens_pool_each_nine():
    # Greens on the odd holes: five of the front nine's, four of the back nine's, in every round.
    response = course_analytics("c1", [_round("r1", 1, 0), _round("r2", 8, 0)])
    assert response.gir_front_nine == 10 / 18 * 100
    assert response.gir_back_nine == 8 / 18 * 100
    assert response.gir_total == 50.0


def test_scorecard_nines_are_null_for_a_nine_not_played():
    front_only = Round(
        id="r1", course=COURSE, date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        hole_scores=[HoleScore(hole_number=i + 1, strokes=p) for i, p in enumerate(PARS[:9])],
    )
    response = course_analytics("c1", [front_only])
    assert response.hole_to_par_front_nine == 0.0
    assert response.hole_to_par_back_nine is None
    assert response.hole_to_par_total == 0.0
    assert response.gir_total is None  # no greens recorded


def test_tees_list_longest_first_with_ties_by_colour():
    from api.course_responses import course_detail
    from models import Tee

    course = Course(
        id="c1", name="Half Moon Bay", holes=COURSE.holes,
        tees=[
            Tee(color="white", hole_yardages={1: 350}),
            Tee(color="Red", hole_yardages={1: 300}),
            Tee(color="Blue", hole_yardages={1: 400}),
            Tee(color="Gold", hole_yardages={1: 350}),
        ],
    )
    assert [t.color for t in course.tees_by_length()] == ["Blue", "Gold", "white", "Red"]
    assert [t.color for t in course_detail(course).tees] == ["Blue", "Gold", "white", "Red"]
