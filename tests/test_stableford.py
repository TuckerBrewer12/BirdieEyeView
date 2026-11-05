"""Net Stableford: the strokes a course handicap gets on each hole, the points a hole is worth,
and a round's total on the round page."""

from uuid import UUID, uuid4
from unittest.mock import AsyncMock

import pytest

from analytics.handicap import round_course_handicap, round_stableford, stableford_points, strokes_received
from api.round_responses import round_detail
from api.routers import rounds
from models import Course, Hole, HoleScore, Round, Tee, User
from tests.helpers import make_mock_database

PARS = [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5]  # par 72
# A real-looking card: odd indexes on the front, even on the back.
INDEXES = [7, 11, 1, 15, 5, 9, 17, 3, 13, 8, 2, 16, 6, 12, 18, 4, 10, 14]


def _course(indexes: list[int | None] | None = None, rating: float = 72.0, slope: float = 113) -> Course:
    si = INDEXES if indexes is None else indexes
    return Course(
        id=str(uuid4()),
        name="Presidio",
        par=sum(PARS),
        holes=[Hole(number=i + 1, par=p, handicap=si[i]) for i, p in enumerate(PARS)],
        tees=[Tee(color="Blue", course_rating=rating, slope_rating=slope, hole_yardages={})],
    )


def _round(course: Course | None, over: list[int], holes: int = 18) -> Round:
    """`over[i]` strokes over par on hole i + 1."""
    return Round(
        id=str(uuid4()),
        course=course,
        tee_box="Blue",
        hole_scores=[HoleScore(hole_number=i + 1, strokes=PARS[i] + over[i], putts=2) for i in range(holes)],
    )


def test_strokes_go_out_hardest_hole_first():
    assert [strokes_received(0, si) for si in (1, 18)] == [0, 0]
    # An 8 gets one on stroke index 1–8 and none from 9.
    assert [strokes_received(8, si) for si in range(1, 19)] == [1] * 8 + [0] * 10
    assert sum(strokes_received(8, si) for si in range(1, 19)) == 8
    # An 18 gets one everywhere.
    assert {strokes_received(18, si) for si in range(1, 19)} == {1}


def test_past_eighteen_the_strokes_go_round_again():
    # A 20 gets two on SI 1 and 2, one everywhere else.
    assert [strokes_received(20, si) for si in (1, 2, 3, 18)] == [2, 2, 1, 1]
    assert sum(strokes_received(20, si) for si in range(1, 19)) == 20
    assert sum(strokes_received(40, si) for si in range(1, 19)) == 40


def test_a_plus_handicap_gives_strokes_back_from_the_easiest_hole():
    # A plus 2 gives one back on SI 17 and 18 only.
    assert [strokes_received(-2, si) for si in range(1, 19)] == [0] * 16 + [-1, -1]
    assert sum(strokes_received(-5, si) for si in range(1, 19)) == -5


def test_points_are_two_for_a_net_par():
    assert stableford_points(strokes=4, par=4, received=0) == 2
    assert stableford_points(strokes=5, par=4, received=1) == 2  # net par
    assert stableford_points(strokes=3, par=4, received=0) == 3  # birdie
    assert stableford_points(strokes=2, par=4, received=1) == 5  # net albatross
    assert stableford_points(strokes=5, par=4, received=0) == 1  # bogey
    assert stableford_points(strokes=4, par=4, received=-1) == 1  # a plus golfer's par on SI 18
    # Net double bogey or worse scores nothing, never negative.
    assert stableford_points(strokes=6, par=4, received=0) == 0
    assert stableford_points(strokes=11, par=4, received=1) == 0


def test_a_golfer_who_plays_to_their_handicap_scores_36():
    # Slope 113 and rating 72 on a par 72: index 10 is a course handicap of 10.
    course = _course()
    # A bogey on each of the ten hardest holes, par everywhere else: 82, net 72.
    played = _round(course, [1 if si <= 10 else 0 for si in INDEXES])
    assert round_course_handicap(played, 10.0) == 10
    assert round_stableford(played, 10.0) == 36


def test_points_follow_where_the_strokes_fall():
    course = _course()
    # The same 82, but the ten bogeys come on the easiest holes, where no stroke is received:
    # those ten score 1 point each, and the eight hardest are net birdies at 3 each.
    played = _round(course, [1 if si > 8 else 0 for si in INDEXES])
    assert played.calculate_total_score() == 82
    # Course handicap 10: strokes on SI 1–10. SI 1–8 par = net birdie (3); SI 9–10 bogey with a
    # stroke = net par (2); SI 11–18 bogey without = 1.
    assert round_stableford(played, 10.0) == 8 * 3 + 2 * 2 + 8 * 1


def test_a_blow_up_hole_costs_no_more_than_its_points():
    course = _course()
    level = _round(course, [0] * 18)
    blow_up = _round(course, [6] + [0] * 17)  # a 10 on the first
    # Scratch golfer (index 0 → course handicap 0): 36 for level par, the 10 scores 0 instead of 2.
    assert round_stableford(level, 0.0) == 36
    assert round_stableford(blow_up, 0.0) == 34


def test_no_points_without_a_course_handicap():
    course = _course()
    assert round_stableford(_round(course, [0] * 18), None) is None  # no index
    assert round_stableford(_round(course, [0] * 9, holes=9), 10.0) is None  # a nine
    unrated = _course()
    unrated.tees[0].course_rating = None
    assert round_stableford(_round(unrated, [0] * 18), 10.0) is None


def test_no_points_when_the_strokes_cant_be_placed():
    # A hole without a stroke index.
    missing = _course([None, *INDEXES[1:]])
    assert round_stableford(_round(missing, [0] * 18), 10.0) is None
    # Two holes on the same stroke index (a misread card).
    doubled = _course([1, *INDEXES[1:]])
    assert round_stableford(_round(doubled, [0] * 18), 10.0) is None


def test_the_round_page_sends_the_points():
    course = _course()
    played = _round(course, [1 if si <= 10 else 0 for si in INDEXES])
    detail = round_detail(played, 10.0)
    assert (detail.course_handicap, detail.net_score, detail.stableford_points) == (10, 72, 36)
    assert round_detail(played).stableford_points is None


@pytest.mark.asyncio
async def test_the_round_endpoint_scores_off_the_signed_in_golfers_index():
    user_id = uuid4()
    user = User(id=str(user_id), name="Sam", email="sam@example.com", handicap=10.0)
    played = _round(_course(), [1 if si <= 10 else 0 for si in INDEXES])
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[played])
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))
    db.rounds.get_round = AsyncMock(return_value=played)

    detail = await rounds.get_round(UUID(played.id), db, user)

    assert detail.course_handicap is not None
    assert detail.stableford_points is not None
    assert detail.stableford_points == round_stableford(played, 10.0)
