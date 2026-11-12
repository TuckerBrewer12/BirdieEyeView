"""The analytics page's own figures: the headline moves, and the holes, bands and rounds it marks."""

from datetime import datetime, timezone

from analytics import benchmarks
from analytics import stats as analytics
from analytics.headline import headline_figure
from models import Course, Hole, HoleScore, Round


def test_a_headline_figure_moves_by_the_last_five_against_every_round():
    # Scores falling from 90 to 80: the last five average 82, every round 85.
    scores = [90, 88, 86, 84, 82, 82, 82, 82, 80, 84]
    figure = headline_figure("scoring_average", 84.0, scores, lower_is_better=True, digits=1)
    assert figure["change"] == -2.0
    assert figure["verdict"] == "good"
    assert figure["trend"][-1] == 82.0


def test_a_headline_figure_skips_rounds_without_it_and_waits_for_five():
    figure = headline_figure("gir_percentage", 40.0, [30, None, 40, None, 50], lower_is_better=False, digits=0)
    assert (figure["change"], figure["verdict"]) == (None, None)
    assert figure["trend"] == [30.0, 35.0, 40.0]
    # Greens rising is for the better.
    risen = headline_figure("gir_percentage", 40.0, [20, 20, 30, 40, 50, 60], lower_is_better=False, digits=0)
    assert (risen["change"], risen["verdict"]) == (3.0, "good")


def test_rolling_averages_skip_rounds_without_the_figure():
    rows = [{"total_putts": 30}, {"total_putts": None}, {"total_putts": 34}]
    assert [row["rolling_average"] for row in analytics.with_rolling_average(rows, "total_putts")] == [30.0, None, 32.0]


def _course(pars):
    return Course(id="c", name="Test", holes=[Hole(number=i + 1, par=p, handicap=i + 1) for i, p in enumerate(pars)])


def test_the_three_hardest_holes_by_handicap_are_marked():
    course = _course([4] * 18)
    over = {5: 2, 9: 3, 12: 2, 2: 1}  # hole number: strokes over par
    round_ = Round(course=course, date=datetime(2026, 1, 1, tzinfo=timezone.utc), hole_scores=[
        HoleScore(hole_number=n, strokes=4 + over.get(n, 0)) for n in range(1, 19)
    ])
    rows = analytics.scoring_vs_hole_handicap([round_])
    # Holes 9, then 5 and 12 tied (the harder handicap first); hole 2 misses out.
    assert [row["handicap"] for row in rows if row["hardest"]] == [5, 9, 12]


def test_a_round_with_three_three_putts_is_costly():
    course = _course([4] * 18)
    round_ = Round(course=course, hole_scores=[
        HoleScore(hole_number=n, strokes=5, putts=3 if n <= 3 else 2) for n in range(1, 19)
    ])
    assert analytics.three_putts_per_round([round_])[0]["costly"] is True


def test_putts_per_hole_split_ones_twos_and_more():
    course = _course([4] * 4)
    round_ = Round(course=course, hole_scores=[
        HoleScore(hole_number=1, strokes=3, putts=0), HoleScore(hole_number=2, strokes=4, putts=2),
        HoleScore(hole_number=3, strokes=5, putts=3), HoleScore(hole_number=4, strokes=4, putts=None),
    ])
    assert analytics.putts_per_hole([round_]) == {
        "holes": 3, "one_or_fewer": 33.33, "two": 33.33, "three_or_more": 33.33,
    }


def test_the_next_level_is_the_benchmark_a_step_better():
    assert benchmarks.next_level_handicap(12.4) == 10
    assert benchmarks.next_level_handicap(10.0) == 5
    assert benchmarks.next_level_handicap(-1.2) == 0
    assert benchmarks.next_level_handicap(36.0) == 25
    assert benchmarks.next_level_handicap(None) is None
