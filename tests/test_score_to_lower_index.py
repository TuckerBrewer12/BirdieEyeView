from datetime import datetime, timedelta, timezone
from typing import List
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from analytics.handicap import player_handicap_index, score_to_lower_index
from api.course_responses import course_detail
from api.routers import courses
from models import Course, Hole, HoleScore, Round, Tee, User
from tests.helpers import make_mock_database

PARS = [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5]
START = datetime(2026, 3, 1, tzinfo=timezone.utc)
AT_PAR_RATING = 72.0
NEUTRAL_SLOPE = 113


def presidio() -> Course:
    return Course(
        id=str(uuid4()),
        name="Presidio",
        par=sum(PARS),
        holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)],
        tees=[
            Tee(color="Blue", course_rating=AT_PAR_RATING, slope_rating=NEUTRAL_SLOPE, hole_yardages={}),
            Tee(color="White", course_rating=70.1, slope_rating=124, hole_yardages={}),
            Tee(color="Red", hole_yardages={}),
        ],
    )


def blue_round(course: Course, over: int, week: int) -> Round:
    each, extra = divmod(over, 18)
    return Round(
        id=str(uuid4()),
        course=course,
        tee_box="Blue",
        date=START + timedelta(days=7 * week),
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=PARS[i] + each + (1 if i < extra else 0), putts=2)
            for i in range(18)
        ],
    )


def season(course: Course, overs: List[int]) -> List[Round]:
    return [blue_round(course, over, week) for week, over in enumerate(overs)]


def golfer(handicap: float | None = None) -> User:
    return User(id=str(uuid4()), name="Sam", email="sam@example.com", handicap=handicap)


def index_after(user: User, history: List[Round], over: int, course: Course) -> float | None:
    return player_handicap_index(user, [*history, blue_round(course, over, len(history))])


def test_the_score_is_the_highest_that_lowers_the_index_once_posted():
    course, user = presidio(), golfer()
    history = season(course, list(range(29, 9, -1)))
    assert player_handicap_index(user, history) == 13.5

    assert score_to_lower_index(user, history, AT_PAR_RATING, NEUTRAL_SLOPE) == 72 + 16
    assert index_after(user, history, 16, course) < 13.5
    assert index_after(user, history, 17, course) == 13.5


def test_a_counting_round_leaving_the_window_raises_the_bar():
    course, user = presidio(), golfer()
    history = season(course, list(range(10, 30)))
    assert player_handicap_index(user, history) == 13.5

    assert score_to_lower_index(user, history, AT_PAR_RATING, NEUTRAL_SLOPE) == 72 + 9
    assert index_after(user, history, 9, course) < 13.5
    assert index_after(user, history, 10, course) == 13.5


def test_the_tees_rating_and_slope_set_the_score():
    history = season(presidio(), list(range(29, 9, -1)))
    assert score_to_lower_index(golfer(), history, 70.1, 124) == 88


def test_a_golfer_held_at_the_handicap_they_gave_lowers_it_with_a_better_round():
    assert score_to_lower_index(golfer(handicap=10.4), [], 72.4, 130) == 84


def test_no_score_without_an_index_or_ratings():
    course, user = presidio(), golfer()
    two_rounds = season(course, [12, 14])
    assert player_handicap_index(user, two_rounds) is None
    assert score_to_lower_index(user, two_rounds, AT_PAR_RATING, NEUTRAL_SLOPE) is None

    history = season(course, list(range(29, 9, -1)))
    assert score_to_lower_index(user, history, None, NEUTRAL_SLOPE) is None
    assert score_to_lower_index(user, history, AT_PAR_RATING, None) is None


def test_no_score_when_any_round_would_lower_the_index():
    user = golfer()
    history = season(presidio(), [10, 11, 30, 30, 30])
    assert player_handicap_index(user, history) == 10.0
    assert score_to_lower_index(user, history, AT_PAR_RATING, NEUTRAL_SLOPE) is None


@pytest.mark.asyncio
async def test_the_course_page_sends_each_rated_tee_its_score_to_lower_the_index():
    course, user = presidio(), golfer()
    history = season(course, list(range(29, 9, -1)))
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=course)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=list(reversed(history)))

    signed_in = await courses.get_course(UUID(course.id), db, user)
    assert {t.color: t.score_to_lower_index for t in signed_in.tees} == {"Blue": 88, "White": 88, "Red": None}

    signed_out = await courses.get_course(UUID(course.id), db, None)
    assert [t.score_to_lower_index for t in signed_out.tees] == [None, None, None]


def test_a_rounds_course_carries_no_score_to_lower_the_index():
    assert [t.score_to_lower_index for t in course_detail(presidio(), 13.5).tees] == [None] * 3


def test_a_nine_hole_course_carries_no_score_to_lower_the_index():
    nine = Course(
        id=str(uuid4()),
        name="Municipal Nine",
        par=sum(PARS[:9]),
        holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS[:9])],
        tees=[Tee(color="Blue", course_rating=35.2, slope_rating=118, hole_yardages={})],
    )
    assert [t.score_to_lower_index for t in course_detail(nine, 13.5, lambda *_: 40).tees] == [None]
