from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from database.converters import (
    course_from_rows,
    course_to_row,
    hole_score_from_row,
    hole_score_to_row,
    round_from_rows,
    round_to_row,
    user_from_row,
    user_tee_from_row,
)
from database.exceptions import IntegrityError
from database.repositories.course_repo import CourseRepositoryDB
from database.repositories.round_repo import RoundRepositoryDB
from database.repositories.user_repo import UserRepositoryDB
from database.repositories.user_tee_repo import UserTeeRepositoryDB
from models import Course, Hole, HoleScore, Round, Tee, User, UserTee


def _round_row(round_id, *, course_id=None, course_name_played=None, tee_box_played=None, total_score=80):
    """Helper: minimal users.rounds row dict."""
    return {
        "id": round_id,
        "user_id": uuid4(),
        "course_id": course_id,
        "tee_id": None,
        "round_date": None,
        "total_score": total_score,
        "adjusted_gross_score": None,
        "score_differential": None,
        "is_complete": True,
        "holes_played": 18,
        "weather_conditions": None,
        "notes": None,
        "course_name_played": course_name_played,
        "tee_box_played": tee_box_played,
        "user_tee_id": None,
    }


def _hole_score_row(*, hole_number=1, strokes=5, par_played=4, handicap_played=7):
    """Helper: minimal users.hole_scores row dict."""
    return {
        "hole_number": hole_number,
        "strokes": strokes,
        "net_score": None,
        "putts": 2,
        "shots_to_green": 3,
        "fairway_hit": True,
        "green_in_regulation": False,
        "par_played": par_played,
        "handicap_played": handicap_played,
    }


# ================================================================
# converters.py — pure function tests (no mocks needed)
# ================================================================

def test_hole_score_converter_maps_par_played():
    """hole_score_from_row correctly maps par_played and handicap_played."""
    row = _hole_score_row(strokes=5, par_played=4, handicap_played=7)
    hs = hole_score_from_row(row)

    assert hs.par_played == 4
    assert hs.handicap_played == 7
    assert hs.to_par() == 1          # 5 - 4, using par_played fallback
    assert hs.get_score_type() == "bogey"


def test_hole_score_converter_null_par_played():
    """hole_score_from_row handles NULL par_played gracefully."""
    row = _hole_score_row(par_played=None, handicap_played=None)
    hs = hole_score_from_row(row)
    assert hs.par_played is None
    assert hs.to_par() is None


def test_hole_score_to_row_includes_par_played():
    """Snapshot positions remain stable; the new played state is appended."""
    hs = HoleScore(hole_number=1, strokes=5, par_played=4, handicap_played=7)
    rid = uuid4()
    row = hole_score_to_row(hs, rid, None)

    assert len(row) == 12
    assert row[11] is None
    assert row[0] == rid           # round_id
    assert row[1] is None          # hole_id (nullable)
    assert row[2] == 1             # hole_number
    assert row[3] == 5             # strokes
    assert row[9] == 4             # par_played
    assert row[10] == 7            # handicap_played


def test_round_converter_maps_course_name_played():
    """round_from_rows correctly maps course_name_played."""
    rid = uuid4()
    row = _round_row(rid, course_name_played="Eagle Vines Golf Club")
    r = round_from_rows(row, [], None)

    assert r.id == str(rid)
    assert r.course_name_played == "Eagle Vines Golf Club"
    assert r.course is None


def test_round_converter_hole_scores_sorted():
    """round_from_rows sorts hole scores by hole_number."""
    rid = uuid4()
    row = _round_row(rid)
    score_rows = [
        _hole_score_row(hole_number=3, strokes=4, par_played=4),
        _hole_score_row(hole_number=1, strokes=5, par_played=4),
        _hole_score_row(hole_number=2, strokes=3, par_played=3),
    ]
    r = round_from_rows(row, score_rows, None)

    assert [hs.hole_number for hs in r.hole_scores] == [1, 2, 3]


def _course_row(*, total_holes, par):
    """Helper: minimal courses.courses row dict."""
    return {
        "id": uuid4(), "name": "Nine Hole Course", "external_course_id": None,
        "location": None, "par": par, "total_holes": total_holes, "user_id": None,
    }


def _hole_rows(numbers, par=4):
    return [{"hole_number": n, "par": par, "handicap": n} for n in numbers]


def test_course_converter_loads_nine_hole_layout():
    """A stored nine-hole layout keeps its par and lets a full nine score as complete."""
    course = course_from_rows(_course_row(total_holes=9, par=36), _hole_rows(range(1, 10)), [], {})

    assert course.total_holes == 9
    assert course.get_par() == 36

    scores = [HoleScore(hole_number=n, strokes=5) for n in range(1, 10)]
    round_ = Round(course=course, hole_scores=scores)
    assert round_.is_complete() is True
    assert round_.get_par() == 36
    assert round_.total_to_par() == 9


def test_course_converter_null_total_holes_keeps_legacy_inference():
    """NULL total_holes does not make nine hole rows a nine-hole layout."""
    nine = course_from_rows(_course_row(total_holes=None, par=36), _hole_rows(range(1, 10)), [], {})
    eighteen = course_from_rows(_course_row(total_holes=None, par=72), _hole_rows(range(1, 19)), [], {})

    assert nine.total_holes is None
    assert nine.get_par() is None
    assert eighteen.get_par() == 72


def test_course_to_row_prefers_declared_total_holes():
    """An explicit layout is persisted even when hole rows are incomplete."""
    declared = Course(name="Nine", total_holes=9, holes=[Hole(number=1, par=4)])
    legacy = Course(name="Legacy", holes=[Hole(number=n, par=4) for n in range(1, 19)])

    assert course_to_row(declared)["total_holes"] == 9
    assert course_to_row(legacy)["total_holes"] == 18
    assert course_to_row(Course(name="Empty"))["total_holes"] is None


@pytest.mark.parametrize(
    "numbers, expected",
    [(range(1, 10), 9), (range(1, 6), None), (range(10, 19), None), ([*range(1, 9), 10], None)],
)
def test_course_to_row_keeps_exact_front_nine_layout(numbers, expected):
    """An exact 1-9 scan keeps its nine-hole layout; partial or back-nine lists stay unknown."""
    course = Course(name="Scanned", holes=[Hole(number=n, par=4) for n in numbers])
    assert course_to_row(course)["total_holes"] == expected


def test_user_tee_converter_roundtrip():
    """user_tee_from_row correctly maps all fields including JSONB hole_yardages."""
    tid = uuid4()
    row = {
        "id": tid,
        "user_id": uuid4(),
        "course_id": None,
        "name": "My Tee",
        "slope_rating": 120,
        "course_rating": 72.0,
        "hole_yardages": {"1": 400, "9": 350},  # JSONB keys are strings
        "created_at": None,
    }
    ut = user_tee_from_row(row)

    assert ut.id == str(tid)
    assert ut.name == "My Tee"
    assert ut.slope_rating == 120.0
    assert ut.hole_yardages == {1: 400, 9: 350}   # keys converted to int


def test_user_converter_maps_friend_code():
    """user_from_row should map friend_code from users.users."""
    uid = uuid4()
    row = {
        "id": uid,
        "friend_code": "GCABC12345",
        "name": "Guo",
        "email": "guo@example.com",
        "home_course_id": None,
        "handicap_index": None,
        "created_at": None,
    }
    user = user_from_row(row)
    assert user.id == str(uid)
    assert user.friend_code == "GCABC12345"


@pytest.mark.parametrize('yardages', ['{"1":400,"01":500}', '{"1":true}', '[]', 'not json'])
def test_user_tee_converter_rejects_invalid_stored_yardages(yardages):
    row = {
        'id': uuid4(), 'user_id': uuid4(), 'course_id': None, 'name': 'Blue',
        'slope_rating': None, 'course_rating': None, 'hole_yardages': yardages, 'created_at': None,
    }
    with pytest.raises(IntegrityError, match='Invalid stored user tee data'):
        user_tee_from_row(row)


# ================================================================
# CourseRepositoryDB
# ================================================================

# ================================================================
# RoundRepositoryDB
# ================================================================


# ================================================================
# UserTeeRepositoryDB
# ================================================================


from database.repositories.course_repo import _tee_yardage_similarity  # noqa: E402


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ({}, {1: 400}, (0.0, 0)),
        ({1: 400}, {2: 400}, (0.0, 0)),
        ({1: 400}, {1: 420}, (1.0, 1)),
    ],
)
def test_tee_yardage_similarity(left, right, expected):
    assert _tee_yardage_similarity(left, right) == expected
