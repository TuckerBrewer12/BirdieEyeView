"""The Round model is the one place a round's figures are worked out."""

import json
from datetime import date

from database.converters import round_from_summary_row
from api.round_responses import round_detail
from models import Course, Hole, HoleScore, Round, Tee, UserTee
from models.hole_score import score_kind


def _holes(strokes, par_played=4):
    return [HoleScore(hole_number=i + 1, strokes=s, par_played=par_played) for i, s in enumerate(strokes)]


def test_score_kind_buckets_the_extremes():
    assert [score_kind(d) for d in (-3, -2, -1, 0, 1, 2, 3, 4, 6)] == [
        "eagle", "eagle", "birdie", "par", "bogey", "double", "triple", "quad", "quad",
    ]
    assert score_kind(None) is None


def test_hole_par_prefers_the_course_then_par_played():
    course = Course(holes=[Hole(number=1, par=3)])
    round_ = Round(course=course, hole_scores=_holes([4, 5], par_played=5))
    assert round_.get_hole_par(1) == 3
    assert round_.get_hole_par(2) == 5


def test_a_nine_totals_only_once_all_nine_are_scored():
    front_only = Round(hole_scores=_holes([4] * 9))
    assert front_only.calculate_front_nine() == 36
    assert front_only.calculate_back_nine() is None

    part_played = Round(hole_scores=_holes([4] * 5))
    assert part_played.calculate_front_nine() is None


def test_hole_handicap_prefers_the_course_then_handicap_played():
    course = Course(holes=[Hole(number=1, par=4, handicap=7)])
    round_ = Round(course=course, hole_scores=[
        HoleScore(hole_number=1, strokes=4, handicap_played=3),
        HoleScore(hole_number=2, strokes=4, handicap_played=11),
    ])
    assert round_.get_hole_handicap(1) == 7
    assert round_.get_hole_handicap(2) == 11


def test_yardage_comes_from_the_tee_played_then_the_user_tee():
    tee = Tee(color="Blue", total_yardage=6500, hole_yardages={1: 400, 2: 150})
    course = Course(holes=[Hole(number=1, par=4)], tees=[tee])
    played_blue = Round(course=course, tee_box="blue", hole_scores=_holes([4, 3]))
    assert played_blue.get_hole_yardage(1) == 400
    assert played_blue.get_total_yardage() == 6500

    user_tee = UserTee(user_id="u1", name="Mine", hole_yardages={1: 380, 2: 140})
    own_tee = Round(user_tee=user_tee, hole_scores=_holes([4, 3]))
    assert own_tee.get_hole_yardage(2) == 140
    assert own_tee.get_total_yardage() == 520

    assert Round(hole_scores=_holes([4])).get_hole_yardage(1) is None


def test_a_nine_adds_up_par_putts_greens_and_yards():
    holes = [
        HoleScore(hole_number=n, strokes=5, putts=2, par_played=4, green_in_regulation=n % 2 == 0)
        for n in range(1, 10)
    ]
    tee = Tee(color="White", hole_yardages={n: 300 + n for n in range(1, 10)})
    round_ = Round(course=Course(tees=[tee]), tee_box="White", hole_scores=holes)
    assert round_.nine_par(1, 9) == 36
    assert round_.nine_to_par(1, 9) == 9
    assert round_.nine_putts(1, 9) == 18
    assert round_.nine_gir(1, 9) == 4
    assert round_.nine_yardage(1, 9) == 2745

    assert round_.nine_par(10, 18) is None
    assert round_.nine_to_par(10, 18) is None
    assert round_.nine_putts(10, 18) is None
    assert round_.nine_gir(10, 18) is None
    assert round_.nine_yardage(10, 18) is None


def test_a_nine_leaves_out_figures_it_cannot_finish():
    holes = _holes([4] * 8 + [None])
    holes[0].putts = 2
    round_ = Round(hole_scores=holes)
    # Hole 9 is unplayed, so the nine has a par but no score; hole 2 is scored without putts.
    assert round_.nine_par(1, 9) == 36
    assert round_.nine_to_par(1, 9) is None
    assert round_.nine_putts(1, 9) is None


def test_round_detail_sends_the_scorecard_figures():
    tee = Tee(color="Blue", hole_yardages={1: 410})
    course = Course(holes=[Hole(number=1, par=4, handicap=5)], tees=[tee])
    round_ = Round(id="r1", course=course, tee_box="Blue", hole_scores=[
        HoleScore(hole_number=1, strokes=5, putts=2, green_in_regulation=False),
    ])
    response = round_detail(round_)
    assert (response.hole_scores[0].handicap, response.hole_scores[0].yardage) == (5, 410)
    assert response.nines.front.putts == 2
    assert response.nines.front.gir == 0
    assert response.nines.front.par is None
    assert response.yards == 410


def test_score_counts_leave_out_holes_without_par():
    round_ = Round(hole_scores=[*_holes([3, 4, 6]), HoleScore(hole_number=4, strokes=5)])
    assert round_.get_score_counts() == {"birdie": 1, "par": 1, "double": 1}


def test_list_row_becomes_a_round_that_reads_course_par_first():
    row = {
        "id": "r1",
        "course_id": "c1",
        "course_name": "Blue Rock",
        "course_location": "MA",
        "course_par": 72,
        "tee_box_played": "Blue",
        "round_date": date(2026, 4, 18),
        "notes": None,
        "course_name_played": None,
        "hole_scores": json.dumps([
            {"hole_number": 1, "strokes": 4, "putts": 2, "fairway_hit": True,
             "green_in_regulation": True, "par_played": 5, "course_par": 4},
            {"hole_number": 2, "strokes": 4, "putts": 1, "fairway_hit": None,
             "green_in_regulation": False, "par_played": 3, "course_par": None},
        ]),
    }
    round_ = round_from_summary_row(row)
    assert round_.course.name == "Blue Rock"
    assert round_.get_hole_par(1) == 4
    assert round_.get_hole_par(2) == 3
    assert round_.get_par() == 72
    assert round_.get_total_putts() == 3
    assert round_.get_fairways_hit() == 1


def test_list_row_without_a_course_or_holes():
    row = {
        "id": "r2", "course_id": None, "course_name": None, "course_location": None,
        "course_par": None, "tee_box_played": None, "round_date": None, "notes": None,
        "course_name_played": "Scanned", "hole_scores": None,
    }
    round_ = round_from_summary_row(row)
    assert round_.course is None
    assert round_.hole_scores == []
    assert round_.calculate_total_score() is None
