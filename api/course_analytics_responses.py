"""A player's analytics at one course, built in one place from their rounds there."""

from typing import List

from analytics import stats as analytics
from api.round_responses import round_summary
from api.schemas import CourseAnalyticsResponse
from models import Round


def course_analytics(course_id: str, rounds: List[Round]) -> CourseAnalyticsResponse:
    """The player's figures at one course, from their rounds there (oldest first)."""
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    by_hole = analytics.average_score_relative_to_par_by_hole(rounds)
    nines = analytics.hole_average_nines(by_hole)
    # The best round as the round list ranks it, so a nine is never best over a full round.
    best = analytics.best_round(list(reversed(rounds)))
    return CourseAnalyticsResponse(
        course_id=course_id,
        rounds_played=len(rounds),
        scoring_average=analytics.scoring_average(rounds),
        best_score=best.calculate_total_score() if best else None,
        worst_score=max(scores) if scores else None,
        rounds=[round_summary(r) for r in reversed(rounds)],
        score_trend_on_course=analytics.score_trend_on_this_course(rounds),
        average_score_relative_to_par_by_hole=by_hole,
        hole_averages_front_nine=nines["front_nine"],
        hole_averages_back_nine=nines["back_nine"],
        hole_averages_total=nines["total"],
        gir_percentage_by_hole=analytics.gir_percentage_by_hole(rounds),
        average_putts_by_hole=analytics.average_putts_by_hole(rounds),
        score_type_distribution_by_hole=analytics.score_type_distribution_by_hole(rounds),
        course_difficulty_profile_by_hole=analytics.course_difficulty_profile_by_hole(rounds),
        average_score_when_gir_vs_missed=analytics.average_score_when_gir_vs_missed(rounds),
        score_variance_by_hole=analytics.score_variance_by_hole(rounds),
    )
