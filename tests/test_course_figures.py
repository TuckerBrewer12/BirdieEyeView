"""The Course model works out a course's figures, and the course response carries them."""

from api.course_responses import course_detail
from api.round_responses import round_detail
from models import Course, Hole, HoleScore, Round, Tee

PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5]


def _holes(pars=PARS):
    return [Hole(number=i + 1, par=p, handicap=i + 1) for i, p in enumerate(pars)]


def _yards(first, last, yards=400):
    return {n: yards for n in range(first, last + 1)}


def test_a_nine_has_yardage_only_once_all_nine_holes_do():
    full = Tee(color="Blue", hole_yardages=_yards(1, 18))
    assert full.front_nine_yardage == 3600
    assert full.back_nine_yardage == 3600

    front_only = Tee(color="White", hole_yardages=_yards(1, 9))
    assert front_only.front_nine_yardage == 3600
    assert front_only.back_nine_yardage is None

    gap = Tee(color="Red", hole_yardages=_yards(1, 8))
    assert gap.front_nine_yardage is None


def test_course_response_carries_par_nines_and_tee_yardages():
    course = Course(
        id="c1",
        name="Half Moon Bay",
        holes=_holes(),
        tees=[
            Tee(color="Blue", hole_yardages=_yards(1, 18)),
            Tee(color="White", total_yardage=6100, hole_yardages={}),
        ],
    )
    response = course_detail(course)

    assert response.par == 72
    assert (response.front_nine_par, response.back_nine_par) == (36, 36)
    blue, white = response.tees
    assert (blue.total_yardage, blue.front_nine_yardage, blue.back_nine_yardage) == (7200, 3600, 3600)
    assert (white.total_yardage, white.front_nine_yardage) == (6100, None)


def test_stored_par_wins_over_the_hole_sum():
    course = Course(par=71, holes=_holes())
    assert course_detail(course).par == 71
    assert course_detail(course).front_nine_par == 36


def test_partial_holes_leave_par_figures_null():
    course = Course(holes=_holes(PARS[:9]))
    response = course_detail(course)
    assert response.par is None
    assert response.front_nine_par == 36
    assert response.back_nine_par is None


def test_round_detail_sends_the_course_response():
    course = Course(id="c1", holes=_holes(), tees=[Tee(color="Blue", hole_yardages=_yards(1, 18))])
    response = round_detail(Round(course=course, hole_scores=[HoleScore(hole_number=1, strokes=4)]))
    assert response.course.par == 72
    assert response.course.tees[0].front_nine_yardage == 3600
