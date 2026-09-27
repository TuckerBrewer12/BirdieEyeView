"""The Round model is the one place a round's figures are worked out."""

import json
from datetime import date

from database.converters import round_from_summary_row
from models import Course, Hole, HoleScore, Round
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
