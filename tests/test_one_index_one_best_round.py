"""One handicap index and one best round: every screen that shows either reads the same one."""

import importlib.util
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from analytics import goals, peak
from analytics import handicap as hcap
from analytics import stats
from analytics.handicap import course_handicap
from api.player_handicap import player_handicap_index
from api.routers import rounds as rounds_router
from api.routers import stats as stats_router
from models import Course, Hole, HoleScore, Round, Tee, User

_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "sample_golfer.py"
_spec = importlib.util.spec_from_file_location("sample_golfer", _SCRIPT)
sample_golfer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sample_golfer)


def _database(user: User, rounds: list[Round]):
    """The golfer and their rounds, answering the queries the stats and round endpoints make."""
    newest_first = sorted(rounds, key=lambda r: r.date, reverse=True)

    async def get_user(_user_id):
        return user

    async def get_round_summaries_for_user(_user_id, *, limit=100, offset=0):
        return newest_first[offset:offset + limit]

    async def get_rounds_for_user(_user_id, limit=20, offset=0, course_id=None, date_from=None):
        picked = [
            r for r in newest_first
            if (course_id is None or (r.course and r.course.id == course_id))
            and (date_from is None or r.date.date() >= date_from)
        ]
        return picked[offset:offset + limit]

    async def get_round(round_id):
        return next(r for r in rounds if r.id == round_id)

    async def get_round_owner_id(_round_id):
        return user.id

    async def are_friends(_a, _b):
        return False

    return SimpleNamespace(
        users=SimpleNamespace(get_user=get_user),
        rounds=SimpleNamespace(
            get_round_summaries_for_user=get_round_summaries_for_user,
            get_rounds_for_user=get_rounds_for_user,
            get_round=get_round,
            get_round_owner_id=get_round_owner_id,
        ),
        friendships=SimpleNamespace(are_friends=are_friends),
    )


@pytest.fixture
def golfer():
    """The demo golfer's 24 rounds, for a golfer who gave a 6.0 halfway through: the rounds
    before it only count where they beat it, so their index is not the plain WHS one."""
    rounds = sample_golfer._season()
    user = sample_golfer.USER.model_copy(update={"handicap": 6.0, "last_handicap_update": rounds[12].date})
    return user, rounds, _database(user, rounds)


@pytest.mark.asyncio
async def test_every_screen_shows_the_golfers_own_index(golfer):
    user, rounds, db = golfer
    user_id = UUID(user.id)
    index = await player_handicap_index(db, user)
    assert index is not None
    # The handicap they gave holds rounds back, so the plain WHS figure over the same rounds differs.
    assert index != hcap.handicap_index(rounds[-20:])

    dashboard = await stats_router.get_dashboard(user_id, db, user)
    assert dashboard.handicap_index == index
    assert dashboard.handicap_trend[-1].handicap_index == index

    unfiltered = await stats_router.get_analytics(user_id, 50, None, None, db, user)
    lab = await stats_router.get_analytics(user_id, 20, None, None, db, user)
    career = await stats_router.get_analytics(user_id, 500, None, None, db, user)
    by_course = await stats_router.get_analytics(user_id, 50, sample_golfer.HALF_MOON_BAY.id, None, db, user)
    for response in (unfiltered, lab, career, by_course):
        assert response.kpis.handicap_index == index
    assert career.handicap_trend[-1].handicap_index == index

    # Narrowed to a course, each round still shows the golfer's index after it, not one worked
    # out from that course's rounds alone.
    after = {row.round_id: row.handicap_index for row in career.handicap_trend}
    assert [row.round_id for row in by_course.handicap_trend] == [row.round_id for row in by_course.score_trend]
    assert all(row.handicap_index == after[row.round_id] for row in by_course.handicap_trend)

    # The round page's course handicap starts from the same index.
    latest = rounds[-1]
    detail = await rounds_router.get_round(UUID(latest.id), db, user)
    tee = latest.get_tee()
    assert detail.course_handicap == course_handicap(index, tee.slope_rating, tee.course_rating, latest.get_par())


@pytest.mark.asyncio
async def test_a_timeframe_narrows_the_rounds_not_the_index(golfer, monkeypatch):
    user, rounds, db = golfer

    class _Today(date):
        @classmethod
        def today(cls):
            return rounds[-1].date.date() + timedelta(days=30)

    monkeypatch.setattr(stats_router, "date", _Today)
    year = await stats_router.get_analytics(UUID(user.id), 50, None, "1y", db, user)
    assert year.kpis.handicap_index == await player_handicap_index(db, user)


@pytest.mark.asyncio
async def test_the_dashboards_breakdown_and_change_add_up_to_the_index_shown(golfer):
    user, _, db = golfer
    dashboard = await stats_router.get_dashboard(UUID(user.id), db, user)
    whs = dashboard.whs
    used = [row.differential for row in whs.rows if row.used]
    assert len(used) == whs.count_used
    assert round(sum(used) / len(used) + whs.adjustment, 1) == dashboard.handicap_index
    # The rows marked counting on the trend are the ones the breakdown counts.
    counting = [row for row in dashboard.handicap_trend if row.differential_status == "counting"]
    assert len(counting) == whs.count_used


def test_the_trend_reads_the_20_rounds_ending_with_each_round():
    """Past 20 rounds, the oldest falls out of the window, so a great round 21 rounds ago no
    longer holds the index down."""
    course = Course(
        id="c", name="C", par=72,
        holes=[Hole(number=i, par=4) for i in range(1, 19)],
        tees=[Tee(color="Blue", course_rating=72.0, slope_rating=113.0)],
    )
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def played(over, day):
        return Round(id=f"r{day}", course=course, tee_box="Blue", date=start + timedelta(days=day), hole_scores=[
            HoleScore(hole_number=i, strokes=4 + (1 if i <= over else 0)) for i in range(1, 19)
        ])

    rounds = [played(0, 0)] + [played(10, day) for day in range(1, 21)]
    trend = hcap.player_handicap_trend(None, rounds)
    # Differentials: 0 (par at a 72 rating), then twenty 10s; the best 8 of 20 count.
    assert trend[19]["handicap_index"] == round((0 + 10 * 7) / 8, 1)
    assert trend[20]["handicap_index"] == 10.0 == hcap.player_handicap_index(None, rounds)
    assert trend[0]["differential_status"] == "out"  # outside the current window


def _round(round_id, strokes_over, *, holes=18, par=4, day=0, course=None):
    return Round(
        id=round_id,
        course=course,
        course_name_played=f"Course {round_id}",
        date=datetime(2026, 4, 1, tzinfo=timezone.utc) + timedelta(days=day),
        hole_scores=[
            HoleScore(hole_number=i, strokes=par + (1 if i <= strokes_over else 0), par_played=par, putts=1,
                      green_in_regulation=True)
            for i in range(1, holes + 1)
        ],
    )


def _mixed_season():
    """An 18 at par 72 three over (75), an 18 at par 70 four over (74), a level-par nine (36) and
    an 18 six over (78). The 75 is the best round; the nine is never best over a full round."""
    par_70 = Course(id="par-70", name="Seventy", par=70, holes=[
        Hole(number=i + 1, par=p) for i, p in enumerate([4, 4, 4, 3, 4, 4, 3, 4, 5] * 2)
    ])
    seventy_four = Round(
        id="74-at-70", course=par_70, date=datetime(2026, 4, 2, tzinfo=timezone.utc),
        hole_scores=[HoleScore(hole_number=h.number, strokes=h.par + (1 if h.number <= 4 else 0), putts=2)
                     for h in par_70.holes],
    )
    return [
        _round("75", 3, day=0),
        seventy_four,
        _round("nine", 0, holes=9, day=3),
        _round("78", 6, day=4),
    ]


def test_best_is_the_round_lists_best_lowest_to_par_full_rounds_first():
    season = _mixed_season()
    newest_first = list(reversed(season))
    assert stats.best_round(newest_first).id == "75"
    places = stats.best_round_ranks(newest_first)
    assert newest_first[next(i for i, p in places.items() if p == 1)].id == "75"
    # Only nines: the best nine.
    assert stats.best_round([_round("nine-a", 2, holes=9), _round("nine-b", 1, holes=9)]).id == "nine-b"
    assert stats.best_round([Round(id="blank")]) is None
    # A tie goes to the earlier in the list: the newest, as lists come.
    assert stats.best_round([_round("newer", 3, day=5), _round("older", 3, day=1)]).id == "newer"


@pytest.mark.asyncio
async def test_dashboard_analytics_and_course_page_name_the_same_best_round():
    season = _mixed_season()
    user = User(id=str(uuid4()), name="Sam", email="sam@example.com")
    db = _database(user, season)
    user_id = UUID(user.id)

    dashboard = await stats_router.get_dashboard(user_id, db, user)
    assert (dashboard.best_round, dashboard.best_round_id) == (75, "75")

    analytics = await stats_router.get_analytics(user_id, 50, None, None, db, user)
    assert (analytics.kpis.best_round, analytics.kpis.best_round_id, analytics.kpis.best_round_course) == (
        75, "75", "Course 75",
    )
    listed = await rounds_router.get_rounds_for_user(user_id, 100, 0, db, user)
    assert next(r.id for r in listed if r.best_rank == 1) == "75"


def test_the_course_page_best_round_is_never_a_nine():
    course = Course(id="home", name="Home", par=72, holes=[Hole(number=i, par=4) for i in range(1, 19)])
    full = _round("full", 5, course=course)
    nine = _round("nine", 0, holes=9, day=1, course=course)
    from api.course_analytics_responses import course_analytics

    assert course_analytics("home", [full, nine]).best_round_id == "full"


def test_records_and_milestones_set_by_a_rounds_total_count_full_rounds_only():
    season = _mixed_season()
    achievements = stats.notable_achievements(season, reference_date=date(2026, 5, 1))
    records = achievements["scoring_records"]["lifetime"]
    assert records["lowest_round"] == 74  # the lowest 18, a record by score: not the nine's 36
    assert achievements["scoring_records_events"]["lifetime"]["lowest_round"]["round_id"] == "74-at-70"
    assert records["fewest_putts_in_round"] == 18  # the 75's 18 one-putts, not the nine's 9
    breaks = {row["threshold"]: row["achievement"] for row in achievements["round_milestones"]["lifetime"]["score_breaks"]}
    assert breaks[75] is not None and breaks[70] is None  # the nine's 36 breaks nothing
    gir = {row["threshold"]: row["achievement"] for row in achievements["gir_milestones"]["lifetime"]["gir_breaks"]}
    assert gir[18]["round_id"] in {"75", "78"}  # 18 of 18 greens, on a full round
    assert achievements["round_milestones"]["lifetime"]["first_round_under_par"] is None


def test_the_goal_report_and_peak_read_full_rounds_for_lowest_and_best():
    season = _mixed_season()
    report = goals.goal_report(season, 79)
    assert report["lowest_score"] == 74
    assert [r.id for r in peak.peak_rounds(season)] == ["75", "74-at-70", "78"]
