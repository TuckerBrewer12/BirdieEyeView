import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import pytest

from database.converters import (
    course_from_rows,
    hole_score_from_row,
    hole_score_to_row,
    round_from_summary_row,
    tee_ratings_to_rows,
    tee_to_row,
    tee_yardages_to_rows,
    user_from_row,
    user_tee_from_row,
    user_tee_to_row,
    user_to_row,
)
from database.exceptions import IntegrityError
from models import HoleScore, Tee, TeeRating, User, UserTee

COURSE_ID = UUID("00000000-0000-0000-0000-0000000000c1")
USER_ID = UUID("00000000-0000-0000-0000-0000000000a1")
ROUND_ID = UUID("00000000-0000-0000-0000-0000000000b1")
BLUE_ID = UUID("00000000-0000-0000-0000-0000000000d1")
WHITE_ID = UUID("00000000-0000-0000-0000-0000000000d2")
HOLE_ID = UUID("00000000-0000-0000-0000-0000000000e1")
CREATED = datetime(2026, 1, 2, 3, 4, 5)  # noqa: DTZ001
RATING_ROW = {"hole_numbers": [1, 2, 3, 4, 5, 6, 7, 8, 9], "course_rating": 35.9, "slope_rating": 128}


def _course_row(**overrides):
    return {
        "id": COURSE_ID, "name": "Blue Rock", "external_course_id": "ext-42",
        "location": "Lakeside, CA", "total_holes": 18, "par": 72, "user_id": USER_ID,
        **overrides,
    }


def _user_row(**overrides):
    return {
        "id": USER_ID, "friend_code": "GCABC12345", "name": "Guo", "email": "guo@example.com",
        "email_verified": True, "email_verified_at": CREATED, "home_course_id": COURSE_ID,
        "handicap_index": Decimal("12.4"), "created_at": CREATED, "last_handicap_update": CREATED,
        "scoring_goal": 85, "scoring_goal_nine": 42,
        **overrides,
    }


def _user_tee_row(**overrides):
    return {
        "id": BLUE_ID, "user_id": USER_ID, "course_id": COURSE_ID, "name": "My Blue",
        "slope_rating": Decimal("131"), "course_rating": Decimal("71.8"),
        "hole_yardages": json.dumps({"1": 401, "2": 175}), "yardage_holes": None,
        "rating_holes": None, "total_yardage": None, "created_at": CREATED,
        **overrides,
    }


def _summary_row(**overrides):
    return {
        "id": ROUND_ID, "course_id": COURSE_ID, "course_name": "Blue Rock", "course_par": 72,
        "tee_box_played": "Blue", "round_date": date(2026, 4, 18), "course_name_played": "Blue Rock GC",
        "hole_scores": None,
        **overrides,
    }


_SUMMARY_HOLES = [
    {"hole_number": 1, "strokes": 4, "putts": 2, "green_in_regulation": True, "par_played": 5, "course_par": 4},
    {"hole_number": 2, "strokes": 3, "putts": 1, "green_in_regulation": False, "par_played": 3, "course_par": None,
     "played": True},
]


def test_course_from_rows_stringifies_ids_sorts_holes_and_gives_each_tee_its_own_rows():
    hole_rows = [{"hole_number": 2, "par": 3, "handicap": None}, {"hole_number": 1, "par": 4, "handicap": 9}]
    tee_rows = [
        {"id": BLUE_ID, "color": "Blue", "slope_rating": Decimal("131"), "course_rating": Decimal("71.8")},
        {"id": WHITE_ID, "color": "White", "slope_rating": None, "course_rating": None, "total_yardage": 6100},
    ]
    yardages = {BLUE_ID: [{"hole_number": 2, "yardage": 175}, {"hole_number": 1, "yardage": 401}]}
    course = course_from_rows(_course_row(), hole_rows, tee_rows, yardages, {BLUE_ID: [RATING_ROW]})

    assert (course.id, course.user_id, course.total_holes, course.par) == (str(COURSE_ID), str(USER_ID), 18, 72)
    assert [(h.number, h.par, h.handicap) for h in course.holes] == [(1, 4, 9), (2, 3, None)]
    blue, white = course.tees
    assert (blue.slope_rating, blue.course_rating) == (131.0, 71.8)
    assert type(blue.slope_rating) is float
    assert blue.hole_yardages == {1: 401, 2: 175}
    assert blue.ratings == [TeeRating(**RATING_ROW)]
    assert (white.slope_rating, white.course_rating, white.hole_yardages, white.ratings) == (None, None, {}, [])
    assert white.total_yardage == 6100


def test_course_from_rows_without_an_owner_or_tee_ratings():
    tee_rows = [{"id": BLUE_ID, "color": "Blue", "slope_rating": None, "course_rating": None}]
    course = course_from_rows(_course_row(user_id=None), [], tee_rows, {})

    assert course.user_id is None
    assert course.tees[0].ratings == []


def test_hole_score_from_row_reads_played_when_the_row_has_it():
    row = {
        "hole_number": 1, "strokes": 5, "net_score": 4, "putts": 2, "shots_to_green": 3, "fairway_hit": True,
        "green_in_regulation": False, "par_played": 4, "handicap_played": 7,
    }

    assert hole_score_from_row(row).played is None
    assert hole_score_from_row({**row, "played": True}).played is True
    assert hole_score_from_row(row).model_dump(exclude={"played"}) == row


def test_user_from_row_maps_every_column_and_keeps_a_zero_handicap():
    user = user_from_row(_user_row())

    assert (user.id, user.home_course_id, user.handicap) == (str(USER_ID), str(COURSE_ID), 12.4)
    assert (user.scoring_goal, user.scoring_goal_nine, user.email_verified) == (85, 42, True)
    assert user_from_row(_user_row(handicap_index=Decimal("0"))).handicap == 0.0


def test_user_from_row_optional_columns_may_be_missing():
    row = _user_row(home_course_id=None, handicap_index=None)
    for key in ("friend_code", "email_verified", "email_verified_at", "last_handicap_update", "scoring_goal",
                "scoring_goal_nine"):
        del row[key]
    user = user_from_row(row)

    assert (user.friend_code, user.email_verified, user.home_course_id, user.handicap) == (None, False, None, None)
    assert (user.scoring_goal, user.scoring_goal_nine, user.last_handicap_update) == (None, None, None)


@pytest.mark.parametrize("yardages", [json.dumps({"1": 401, "2": 175}), {"1": 401, "2": 175}], ids=["text", "dict"])
def test_user_tee_from_row_reads_yardages_as_jsonb_text_or_a_dict(yardages):
    tee = user_tee_from_row(_user_tee_row(hole_yardages=yardages), [RATING_ROW])

    assert (tee.id, tee.user_id, tee.course_id) == (str(BLUE_ID), str(USER_ID), str(COURSE_ID))
    assert (tee.slope_rating, tee.course_rating) == (131.0, 71.8)
    assert tee.hole_yardages == {1: 401, 2: 175}
    assert tee.ratings == [TeeRating(**RATING_ROW)]


def test_user_tee_from_row_without_course_ratings_or_yardages():
    tee = user_tee_from_row(_user_tee_row(course_id=None, slope_rating=None, course_rating=None, hole_yardages=None))

    assert (tee.course_id, tee.slope_rating, tee.course_rating, tee.hole_yardages) == (None, None, None, {})


@pytest.mark.parametrize("yardages", ["not json", "[1]", json.dumps({"x": 1})], ids=["bad-json", "list", "bad-key"])
def test_user_tee_from_row_reports_bad_stored_data(yardages):
    with pytest.raises(IntegrityError, match="Invalid stored user tee data") as raised:
        user_tee_from_row(_user_tee_row(hole_yardages=yardages))
    assert raised.value.__cause__ is not None


@pytest.mark.parametrize("holes", [json.dumps(_SUMMARY_HOLES), _SUMMARY_HOLES], ids=["text", "list"])
def test_round_from_summary_row_reads_hole_scores_as_json_text_or_a_list(holes):
    r = round_from_summary_row(_summary_row(hole_scores=holes, notes="Windy", intended_holes=list(range(1, 19))))

    assert (r.id, r.tee_box, r.course_name_played, r.notes, r.intended_holes) == (
        str(ROUND_ID), "Blue", "Blue Rock GC", "Windy", tuple(range(1, 19)))
    assert [hs.model_dump(exclude_none=True) for hs in r.hole_scores] == [
        {"hole_number": 1, "strokes": 4, "putts": 2, "green_in_regulation": True, "par_played": 5},
        {"hole_number": 2, "strokes": 3, "putts": 1, "green_in_regulation": False, "par_played": 3, "played": True},
    ]
    assert [(h.number, h.par) for h in r.course.holes] == [(1, 4)]
    assert (r.course.id, r.course.name, r.course.par, r.course.total_holes) == (str(COURSE_ID), "Blue Rock", 72, None)


@pytest.mark.parametrize(
    "course_holes",
    [json.dumps([{"number": 3, "par": 5}]), [{"number": 3, "par": 5}]],
    ids=["text", "list"],
)
def test_round_from_summary_row_prefers_the_course_holes_column(course_holes):
    row = _summary_row(hole_scores=_SUMMARY_HOLES, course_holes=course_holes, course_total_holes=9, course_par=None)
    r = round_from_summary_row(row)

    assert [(h.number, h.par) for h in r.course.holes] == [(3, 5)]
    assert r.course.total_holes == 9


@pytest.mark.parametrize("course_holes", [None, "[]"], ids=["null", "empty"])
def test_round_from_summary_row_course_holes_column_without_holes(course_holes):
    r = round_from_summary_row(_summary_row(hole_scores=_SUMMARY_HOLES, course_holes=course_holes))

    assert r.course.holes == []


@pytest.mark.parametrize("holes", [None, "null", "[]", []], ids=["none", "json-null", "json-empty", "empty"])
def test_round_from_summary_row_with_no_hole_scores(holes):
    r = round_from_summary_row(_summary_row(hole_scores=holes))

    assert r.hole_scores == []
    assert r.course.holes == []


def test_round_from_summary_row_without_a_course():
    r = round_from_summary_row(_summary_row(course_id=None, hole_scores=_SUMMARY_HOLES))

    assert r.course is None
    assert len(r.hole_scores) == 2


def test_tee_rows_for_executemany():
    tee = Tee(color="Blue", slope_rating=131, course_rating=71.8, hole_yardages={9: 350, 1: 401},
              ratings=[TeeRating(**RATING_ROW)])

    assert tee_to_row(tee, COURSE_ID) == (COURSE_ID, "Blue", 131, 71.8, None, None, None)
    assert tee_to_row(Tee(color="Red", total_yardage=5200), COURSE_ID)[-1] == 5200
    assert tee_yardages_to_rows(tee, BLUE_ID) == [(BLUE_ID, 1, 401), (BLUE_ID, 9, 350)]
    assert tee_ratings_to_rows(tee, BLUE_ID) == [(BLUE_ID, tuple(RATING_ROW["hole_numbers"]), 35.9, 128.0)]


def test_hole_score_to_row_column_order():
    hs = HoleScore(hole_number=1, strokes=5, net_score=4, putts=2, shots_to_green=3, fairway_hit=True,
                   green_in_regulation=False, par_played=4, handicap_played=7, played=True)

    assert hole_score_to_row(hs, ROUND_ID, HOLE_ID) == (ROUND_ID, HOLE_ID, 1, 5, 4, 2, 3, True, False, 4, 7, True)


def test_user_to_row():
    user = User(name="Guo", email="guo@example.com", friend_code="GCABC12345", handicap=12.4,
                home_course_id=str(COURSE_ID), scoring_goal=85, scoring_goal_nine=42)

    assert user_to_row(user) == {
        "friend_code": "GCABC12345", "name": "Guo", "email": "guo@example.com", "handicap_index": 12.4,
        "home_course_id": COURSE_ID, "scoring_goal": 85, "scoring_goal_nine": 42,
    }
    assert user_to_row(User(name="Guo", email="guo@example.com"))["home_course_id"] is None


def test_user_tee_to_row_stringifies_yardage_keys_and_ids():
    tee = UserTee(user_id=str(USER_ID), course_id=str(COURSE_ID), name="My Blue", slope_rating=131.0,
                  course_rating=71.8, hole_yardages={1: 401, 2: 175})

    assert user_tee_to_row(tee) == {
        "user_id": USER_ID, "course_id": COURSE_ID, "name": "My Blue", "slope_rating": 131.0,
        "course_rating": 71.8, "hole_yardages": {"1": 401, "2": 175}, "yardage_holes": None,
        "rating_holes": None, "total_yardage": None,
    }
    bare = user_tee_to_row(UserTee(user_id=str(USER_ID), name="Mine", total_yardage=5200))
    assert (bare["course_id"], bare["hole_yardages"], bare["total_yardage"]) == (None, {}, 5200)
