"""The analytics and dashboard responses carry what the stats functions work out, typed."""

import importlib.util
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.encoders import jsonable_encoder

from analytics.verdicts import change_verdict
from analytics import handicap as hcap
from analytics import stats as analytics
from api.analytics_responses import analytics_response
from api.routers import stats
from api.schemas import AnalyticsResponse, DashboardResponse, GoalReportResponse, ScoreMix
from models import Course, Hole, HoleScore, Round

_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "sample_golfer.py"
_spec = importlib.util.spec_from_file_location("sample_golfer", _SCRIPT)
sample_golfer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sample_golfer)


def _two_rounds():
    """Two rounds on a par-72 course (par 3s, then 4s, then 5s): a 72 with 36 putts and 10 greens,
    then an 81 with 27 putts and 9 greens."""
    course = Course(
        id="course-1",
        name="Demo Course",
        par=72,
        holes=[Hole(number=i, par=3 if i <= 4 else 4 if i <= 14 else 5, handicap=i) for i in range(1, 19)],
    )
    first = Round(id="r1", course=course, date=datetime(2026, 2, 1, tzinfo=timezone.utc), hole_scores=[
        HoleScore(hole_number=i, strokes=4, putts=2, green_in_regulation=i <= 10) for i in range(1, 19)
    ])
    second = Round(id="r2", course=course, date=datetime(2026, 2, 2, tzinfo=timezone.utc), hole_scores=[
        HoleScore(hole_number=i, strokes=5 if i % 2 else 4, putts=2 if i % 2 else 1, green_in_regulation=i % 2 == 0)
        for i in range(1, 19)
    ])
    return [first, second]


def test_analytics_response_works_out_the_figures_the_page_shows():
    rounds = _two_rounds()
    response = analytics_response(rounds, rounds, today=date(2026, 2, 15))

    assert response.kpis.average_putts == 31.5
    assert [row.rolling_average for row in response.score_trend] == [72.0, 76.5]
    # 36 holes: 6 birdies, 17 pars, 11 bogeys, 2 doubles.
    assert response.score_mix == ScoreMix(birdie=16.67, par=47.22, bogey=30.56, double=5.56)
    # 36 holes with putts: nine one-putts, the rest two-putts.
    assert response.putts_per_hole.model_dump() == {"holes": 36, "one_or_fewer": 25.0, "two": 75.0, "three_or_more": 0.0}
    assert [row.rolling_average for row in response.putts_trend] == [36.0, 31.5]
    # Under five rounds, no figure has a move yet; each still has its five-round line.
    scoring = response.headline[0]
    assert (scoring.metric, scoring.value, scoring.change, scoring.verdict) == ("scoring_average", 76.5, None, None)
    assert scoring.trend == [72.0, 76.5]
    assert [figure.metric for figure in response.headline] == [
        "scoring_average", "gir_percentage", "average_putts", "scrambling_percentage", "three_putt_rate",
    ]
    assert response.notable_achievements.scoring_records.lifetime.lowest_round == 72
    assert (response.kpis.three_putts_per_round, response.kpis.three_putt_rate) == (0.0, 0.0)
    assert response.kpis.scoring_average_change is None  # under five rounds
    assert response.kpis.scoring_average_verdict is None
    peak = response.peak_game
    assert [(r.round_id, r.score) for r in peak.rounds] == [("r1", 72), ("r2", 81)]
    assert peak.average == 76.5
    # Both rounds are the peak, so it matches the average on every kind of hole.
    assert [(i.kind, i.strokes) for i in peak.impacts] == [("birdies", 0.0), ("bogeys", 0.0), ("doubles", 0.0)]


def test_analytics_response_marks_milestones_against_the_last_year_ending_today():
    rounds = _two_rounds()
    breaks = lambda response: response.notable_achievements.round_milestones

    now = breaks(analytics_response(rounds, rounds, today=date(2026, 2, 15)))
    assert now.one_year.new_personal_records_achieved_count == 8  # breaking 120 down to 75, all in round 1
    assert all(row.achievement.in_window for row in now.lifetime.score_breaks if row.achievement)

    later = breaks(analytics_response(rounds, rounds, today=date(2027, 3, 1)))
    assert later.one_year.new_personal_records_achieved_count == 0
    assert not any(row.achievement.in_window for row in later.lifetime.score_breaks if row.achievement)


@pytest.fixture
def season():
    """The demo tour's golfer: 24 rounds over three rated courses, oldest first."""
    rounds = sample_golfer._season()
    return rounds, sample_golfer._database(rounds), sample_golfer.USER


async def _analytics(season, limit=50) -> AnalyticsResponse:
    _, db, user = season
    return await stats.get_analytics(UUID(user.id), limit, None, None, db, user)


@pytest.mark.asyncio
async def test_analytics_response_validates_for_a_season(season):
    response = await _analytics(season)
    # What goes over the wire reads back into the model unchanged.
    wire = jsonable_encoder(response)
    assert AnalyticsResponse.model_validate(wire) == response
    assert response.kpis.total_rounds == 24
    assert response.kpis.handicap_index is not None
    assert len(response.score_trend) == 24
    assert {row.differential_status for row in response.handicap_trend} >= {"counting", "out"}
    assert response.scoring_by_yardage and response.scoring_by_yardage[0].raw_scores


@pytest.mark.asyncio
async def test_analytics_sections_drop_nothing_the_stats_functions_return(season):
    rounds, _, user = season
    sent = (await _analytics(season)).model_dump()
    assert sent["score_trend"] == analytics.score_trend_with_rolling_average(rounds)
    assert sent["net_score_trend"] == analytics.with_rolling_average(
        analytics.net_score_trend(rounds, sent["kpis"]["handicap_index"]), "net_score"
    )
    assert sent["gir_trend"] == analytics.with_rolling_average(analytics.gir_per_round(rounds), "gir_percentage")
    assert sent["putts_trend"] == analytics.with_rolling_average(analytics.putts_per_round(rounds), "total_putts")
    assert sent["three_putts_trend"] == analytics.three_putts_per_round(rounds)
    assert sent["scrambling_trend"] == analytics.scrambling_per_round(rounds)
    assert sent["up_and_down_trend"] == analytics.up_and_down_trend(rounds)
    assert sent["scoring_by_par"] == analytics.scoring_by_par(rounds)
    assert sent["scoring_by_yardage"] == analytics.scoring_by_yardage_buckets(rounds)
    assert sent["scoring_by_handicap"] == analytics.scoring_vs_hole_handicap(rounds)
    assert sent["gir_vs_non_gir"] == analytics.gir_vs_non_gir_score_distribution(rounds)
    assert sent["handicap_trend"] == hcap.player_handicap_trend(user, rounds)
    assert sent["score_differentials"] == hcap.score_differentials_per_round(rounds)
    assert sent["notable_achievements"] == analytics.notable_achievements(
        rounds, home_course_id=user.home_course_id
    )


@pytest.mark.asyncio
async def test_records_and_streaks_name_the_round_they_were_set_in(season):
    achievements = (await _analytics(season)).notable_achievements
    streak = achievements.best_performance_streaks_events.lifetime.longest_par_streak
    assert streak is not None and streak.round_id is not None
    lowest = achievements.scoring_records_events.lifetime.lowest_round
    assert lowest is not None and lowest.round_id is not None


@pytest.mark.asyncio
async def test_dashboard_carries_the_trends_analytics_draws_for_the_last_20(season):
    _, db, user = season
    dashboard = await stats.get_dashboard(UUID(user.id), db, user)
    trends = await _analytics(season, limit=20)

    assert isinstance(dashboard, DashboardResponse)
    assert len(dashboard.score_trend) == 20
    # The same rounds with the same five-round average and par, so the score chart reads alike on both.
    assert dashboard.score_trend == trends.score_trend
    assert all(row.rolling_average is not None and row.par is not None for row in dashboard.score_trend)
    assert dashboard.handicap_trend == trends.handicap_trend
    assert all(row.differential_status != "unrated" for row in dashboard.handicap_trend)
    # The scoring average's move and the server's verdict on it, which the desktop tile shows.
    assert dashboard.scoring_average_change is not None
    assert dashboard.scoring_average_verdict == change_verdict(dashboard.scoring_average_change)


@pytest.mark.asyncio
async def test_goal_report_is_typed(season):
    _, db, user = season
    report = await stats.get_goal_report(UUID(user.id), 20, db, user)
    assert isinstance(report, GoalReportResponse)
    assert report.scoring_goal == 79
    assert report.savers
    assert GoalReportResponse.model_validate(jsonable_encoder(report)) == report
