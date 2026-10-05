"""A player's analytics at one course, built in one place from their rounds there."""

from typing import List

from analytics import stats as analytics
from api.round_responses import round_summary
from api.schemas import CourseAnalyticsResponse
from models import Round


def course_analytics(course_id: str, rounds: List[Round]) -> CourseAnalyticsResponse:
    """The player's figures at one course, from their rounds there (oldest first)."""
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    return CourseAnalyticsResponse(
        course_id=course_id,
        rounds_played=len(rounds),
        scoring_average=sum(scores) / len(scores) if scores else None,
        best_score=min(scores) if scores else None,
        worst_score=max(scores) if scores else None,
        rounds=[round_summary(r) for r in reversed(rounds)],
        score_trend_on_course=analytics.score_trend_on_this_course(rounds),
        average_score_relative_to_par_by_hole=analytics.average_score_relative_to_par_by_hole(rounds),
        gir_percentage_by_hole=analytics.gir_percentage_by_hole(rounds),
        average_putts_by_hole=analytics.average_putts_by_hole(rounds),
        score_type_distribution_by_hole=analytics.score_type_distribution_by_hole(rounds),
        course_difficulty_profile_by_hole=analytics.course_difficulty_profile_by_hole(rounds),
        average_score_when_gir_vs_missed=analytics.average_score_when_gir_vs_missed(rounds),
        score_variance_by_hole=analytics.score_variance_by_hole(rounds),
    )
