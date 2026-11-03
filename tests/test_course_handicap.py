"""Course handicaps and net scores are worked out once, on the server, off the golfer's own index."""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from analytics import stats
from analytics.handicap import (
    course_handicap,
    player_handicap_index,
    round_course_handicap,
    round_net_score,
    tee_course_handicap,
)
from api.course_responses import course_detail
from api.round_responses import round_detail, round_list
from api.routers import courses, rounds, stats as stats_router
from api.routers.scan import _add_course_handicaps
from models import Course, Hole, HoleScore, Round, Tee, User
from tests.helpers import make_mock_database

PARS = [4, 5, 4, 3, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 3, 4, 4, 5]  # par 72


def _course(rating: float = 72.4, slope: float = 130) -> Course:
    return Course(
        id=str(uuid4()),
        name="Presidio",
        par=sum(PARS),
        holes=[Hole(number=i + 1, par=p) for i, p in enumerate(PARS)],
        tees=[
            Tee(color="Blue", course_rating=rating, slope_rating=slope, hole_yardages={}),
            Tee(color="White", course_rating=70.1, slope_rating=124, hole_yardages={}),
            Tee(color="Red", hole_yardages={}),
        ],
    )


def _round(course: Course, over: int, holes: int = 18, played: datetime | None = None) -> Round:
    """A round `over` par on the first `holes` holes: one stroke over on each of the first `over`."""
    return Round(
        id=str(uuid4()),
        course=course,
        tee_box="Blue",
        date=played or datetime(2026, 5, 1),
        hole_scores=[
            HoleScore(hole_number=i + 1, strokes=PARS[i] + (1 if i < over else 0), putts=2)
            for i in range(holes)
        ],
    )


def test_course_handicap_is_the_whs_formula_to_the_nearest_stroke():
    # 10.4 × 130 / 113 + (72.4 − 72) = 12.36
    assert course_handicap(10.4, 130, 72.4, 72) == 12
    # A half goes up, the way golfers round it: 0 × 113 / 113 + (72.5 − 72) = 0.5 → 1.
    assert course_handicap(0, 113, 72.5, 72) == 1
    # A plus index: −2 × 113 / 113 + (71.5 − 72) = −2.5 → −2, a plus 2.
    assert course_handicap(-2, 113, 71.5, 72) == -2


def test_a_tee_has_no_course_handicap_without_an_index_ratings_or_par():
    assert tee_course_handicap(None, 130, 72.4, 72) is None
    assert tee_course_handicap(10.4, None, 72.4, 72) is None
    assert tee_course_handicap(10.4, 130, None, 72) is None
    assert tee_course_handicap(10.4, 130, 72.4, None) is None
    assert tee_course_handicap(10.4, 130, 72.4, 72) == 12


def test_a_round_nets_its_gross_less_the_course_handicap_off_the_tee_played():
    round_ = _round(_course(), over=10)
    assert round_course_handicap(round_, 10.4) == 12
    assert round_net_score(round_, 10.4) == 82 - 12
    assert round_net_score(round_, None) is None


def test_a_nine_has_no_course_handicap_or_net_score():
    """Tee ratings are for 18 holes, so a nine read against them would net 30-odd under par."""
    nine = _round(_course(), over=3, holes=9)
    assert round_course_handicap(nine, 10.4) is None
    assert round_net_score(nine, 10.4) is None


def test_the_round_page_and_the_net_score_trend_give_a_round_the_same_net_score():
    played = [_round(_course(), over=n) for n in (8, 14, 11)]
    trend = stats.net_score_trend(played, 10.4)
    for round_, row in zip(played, trend):
        detail = round_detail(round_, 10.4)
        assert detail.net_score is not None
        assert (detail.course_handicap, detail.net_score) == (row["course_handicap"], row["net_score"])


@pytest.mark.asyncio
async def test_the_round_endpoint_and_analytics_net_a_round_off_the_same_index():
    """The round page and the analytics trend both read the golfer's own index, so one round
    shows one net score, even for a golfer whose index still leans on the handicap they gave."""
    user_id = uuid4()
    user = User(id=str(user_id), name="Sam", email="sam@example.com", handicap=6.0)
    course = _course()
    start = datetime(2026, 3, 1)
    season = [_round(course, over=n, played=start + timedelta(days=7 * i)) for i, n in enumerate((12, 9, 15, 10))]
    newest_first = list(reversed(season))
    db = make_mock_database()
    db.users.get_user = AsyncMock(return_value=user)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=newest_first)
    db.rounds.get_round_owner_id = AsyncMock(return_value=str(user_id))

    index = player_handicap_index(user, season)
    assert index is not None

    analytics = await stats_router.get_analytics(user_id, 50, None, None, db, user)
    trend = {row.round_id: row for row in analytics.net_score_trend}
    for round_ in season:
        db.rounds.get_round = AsyncMock(return_value=round_)
        detail = await rounds.get_round(UUID(round_.id), db, user)
        assert detail.net_score is not None
        assert detail.net_score == trend[round_.id].net_score
        assert detail.course_handicap == trend[round_.id].course_handicap == course_handicap(
            index, 130, 72.4, 72
        )


@pytest.mark.asyncio
async def test_a_course_sends_the_signed_in_golfers_course_handicap_per_tee():
    user = User(id=str(uuid4()), name="Sam", email="sam@example.com", handicap=10.4)
    course = _course()
    db = make_mock_database()
    db.courses.get_course = AsyncMock(return_value=course)
    db.rounds.get_rounds_for_user = AsyncMock(return_value=[])

    signed_in = await courses.get_course(UUID(course.id), db, user)
    # 10.4 × 124 / 113 + (70.1 − 72) = 9.51
    assert [t.course_handicap for t in signed_in.tees] == [12, 10, None]

    signed_out = await courses.get_course(UUID(course.id), db, None)
    assert [t.course_handicap for t in signed_out.tees] == [None, None, None]


def test_a_course_without_an_index_has_no_course_handicaps():
    assert [t.course_handicap for t in course_detail(_course()).tees] == [None, None, None]


def test_a_scanned_card_gives_each_rated_tee_a_course_handicap():
    payload = {
        "course": {
            "par": 72,
            "tees": [
                {"color": "Blue", "slope_rating": 133, "course_rating": 73.4, "hole_yardages": {}},
                {"color": "White", "slope_rating": None, "course_rating": None, "hole_yardages": {}},
            ],
        }
    }
    _add_course_handicaps(payload, 10)
    # (10 × 133 / 113) + (73.4 − 72) = 13.17
    assert [t.get("course_handicap") for t in payload["course"]["tees"]] == [13, None]


def test_a_hole_marks_three_putts_and_a_round_counts_the_holes_played():
    round_ = _round(_course(), over=0, holes=9)
    round_.hole_scores[0].putts = 3
    round_.hole_scores[1].putts = None
    detail = round_detail(round_)
    assert [h.three_putt for h in detail.hole_scores[:3]] == [True, False, False]
    assert detail.holes_played == 9


def test_a_nine_reads_to_par_against_its_own_holes():
    """Linked to an 18-hole course, a nine one over par is +1, not 35 under."""
    nine = _round(_course(), over=1, holes=9)
    assert nine.total_to_par() == 1
    assert _round(_course(), over=4).total_to_par() == 4


def test_best_puts_full_rounds_first_by_to_par_then_nines():
    par_70 = Course(
        id="par-70",
        par=70,
        holes=[Hole(number=i + 1, par=p) for i, p in enumerate([4, 4, 4, 3, 4, 4, 3, 4, 4] * 2)],
    )
    seventy_five_at_par_72 = _round(_course(), over=3)  # +3
    seventy_four_at_par_70 = Round(
        id="74-at-70",
        course=par_70,
        hole_scores=[HoleScore(hole_number=h.number, strokes=h.par + (1 if h.number <= 4 else 0)) for h in par_70.holes],
    )  # +4
    level_par_nine = _round(_course(), over=0, holes=9)
    unrated = Round(id="no-par", hole_scores=[HoleScore(hole_number=1, strokes=4)])
    listed = [level_par_nine, seventy_four_at_par_70, unrated, seventy_five_at_par_72]

    assert [r.best_rank for r in round_list(listed)] == [3, 2, None, 1]


def test_a_round_under_par_reads_after_the_score_breaks_above_the_golfers_usual_par():
    thresholds = [120, 110, 100, 95, 90, 85, 80, 75, 70, 65, 60]
    assert stats.under_par_position(thresholds, 72) == 8  # after breaking 75
    assert stats.under_par_position(thresholds, 70) == 9  # breaking 70 is the same mark
    assert stats.under_par_position(thresholds, 64) == 10

    assert stats.usual_par([]) == 72
    par_72 = _course()
    assert stats.usual_par([_round(par_72, 5), _round(par_72, 2), _round(par_72, 0, holes=9)]) == 72
