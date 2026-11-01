"""The analytics and dashboard responses carry what the stats functions work out, typed."""

import importlib.util
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.encoders import jsonable_encoder

from analytics import handicap as hcap
from analytics import stats as analytics
from api.routers import stats
from api.schemas import AnalyticsResponse, DashboardResponse, GoalReportResponse

_SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "sample_golfer.py"
_spec = importlib.util.spec_from_file_location("sample_golfer", _SCRIPT)
sample_golfer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sample_golfer)


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
    assert sent["score_trend"] == analytics.score_trend(rounds)
    assert sent["net_score_trend"] == analytics.net_score_trend(rounds, sent["kpis"]["handicap_index"])
    assert sent["gir_trend"] == analytics.gir_per_round(rounds)
    assert sent["putts_trend"] == analytics.putts_per_round(rounds)
    assert sent["three_putts_trend"] == analytics.three_putts_per_round(rounds)
    assert sent["scrambling_trend"] == analytics.scrambling_per_round(rounds)
    assert sent["up_and_down_trend"] == analytics.up_and_down_trend(rounds)
    assert sent["score_type_distribution"] == analytics.score_type_distribution_per_round(rounds)
    assert sent["scoring_by_par"] == analytics.scoring_by_par(rounds)
    assert sent["scoring_by_yardage"] == analytics.scoring_by_yardage_buckets(rounds)
    assert sent["scoring_by_handicap"] == analytics.scoring_vs_hole_handicap(rounds)
    assert sent["gir_vs_non_gir"] == analytics.gir_vs_non_gir_score_distribution(rounds)
    assert sent["handicap_trend"] == hcap.windowed_handicap_trend(rounds, len(rounds))
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
    assert dashboard.score_trend == trends.score_trend
    assert dashboard.handicap_trend == trends.handicap_trend
    assert dashboard.scrambling_trend == trends.scrambling_trend
    assert dashboard.up_and_down_trend == trends.up_and_down_trend
    assert all(row.differential_status != "unrated" for row in dashboard.handicap_trend)


@pytest.mark.asyncio
async def test_goal_report_is_typed(season):
    _, db, user = season
    report = await stats.get_goal_report(UUID(user.id), 20, db, user)
    assert isinstance(report, GoalReportResponse)
    assert report.scoring_goal == 79
    assert report.savers
    assert GoalReportResponse.model_validate(jsonable_encoder(report)) == report
