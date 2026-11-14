from datetime import datetime, timezone

from api.course_analytics_responses import course_analytics
from models import Course, Hole, HoleScore, Round

PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5]
COURSE = Course(id="c1", name="Half Moon Bay", holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)])


def _round(round_id, day, over):
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
    rounds = [_round("r1", 1, 6), _round("r2", 8, 0), _round("r3", 15, 3)]
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


def test_each_hole_carries_how_it_plays():
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])

    first = response.holes[0]
    assert (first.hole_number, first.par, first.sample_size) == (1, 4, 2)
    assert (first.average_score, first.average_to_par) == (4.5, 0.5)
    assert first.score_std_dev == 0.5
    assert (first.gir_percentage, first.average_putts) == (100.0, 2.0)
    assert (first.score_mix.par, first.score_mix.bogey) == (50.0, 50.0)
    assert response.holes[2].score_std_dev == 0.0
    assert first.putts_verdict == "neutral"


def test_each_hole_carries_its_difficulty_rank_and_putts_verdict():
    holes = [
        HoleScore(hole_number=i + 1, strokes=p + (1 if i < 3 else 0), putts=1 if i == 3 else 3 if i == 4 else 2)
        for i, p in enumerate(PARS)
    ]
    r1 = Round(id="r1", course=COURSE, date=datetime(2026, 5, 1, tzinfo=timezone.utc), hole_scores=holes)
    response = course_analytics("c1", [r1, _round("r2", 8, 0)])
    assert [h.difficulty_rank for h in response.holes[:4]] == [1, 2, 3, 4]
    assert [h.putts_verdict for h in response.holes[3:6]] == ["good", "bad", "neutral"]
    assert [hole.hole_number for hole in response.holes] == list(range(1, 19))


def test_a_hole_played_once_has_no_spread():
    response = course_analytics("c1", [_round("r1", 1, 2)])
    assert response.holes[0].score_std_dev is None


def test_the_trend_follows_the_record_oldest_first():
    nine = Round(
        id="n1", course=COURSE, date=datetime(2026, 5, 20, tzinfo=timezone.utc),
        hole_scores=[HoleScore(hole_number=i + 1, strokes=p) for i, p in enumerate(PARS[:9])],
    )
    response = course_analytics("c1", [_round("r1", 1, 6), _round("r2", 8, 0), nine])
    assert [row.round_id for row in response.score_trend] == ["r1", "r2"]
    assert [row.total_score for row in response.score_trend] == [78, 72]
    assert response.score_trend[-1].rolling_average == 75.0


def test_no_rounds_leaves_the_figures_empty():
    response = course_analytics("c1", [])
    assert response.rounds_played == 0
    assert response.last_played is None
    assert response.scoring_average is None
    assert response.best_round_id is None
    assert response.rounds == []
    assert (response.holes, response.score_trend) == ([], [])
    assert response.hole_to_par_total is None
    assert response.gir_total is None


def test_scorecard_nines_sum_the_per_hole_averages_to_par():
    response = course_analytics("c1", [_round("r1", 1, 2), _round("r2", 8, 0)])
    assert response.hole_to_par_front_nine == 1.0
    assert response.hole_to_par_back_nine == 0.0
    assert response.hole_to_par_total == 1.0


def test_greens_pool_each_nine():
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
    assert response.gir_total is None


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
