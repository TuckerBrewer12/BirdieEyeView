"""A player's analytics at one course, built in one place from their rounds there."""

from typing import List

from analytics import stats as analytics
from api.round_responses import round_summary
from api.schemas import CourseAnalyticsResponse
from models import Round


def course_analytics(course_id: str, rounds: List[Round]) -> CourseAnalyticsResponse:
    """The player's figures at one course, from their rounds there (oldest first)."""
    newest_first = list(reversed(rounds))
    record = analytics.course_record(newest_first)
    by_hole = analytics.average_score_relative_to_par_by_hole(rounds)
    gir_by_hole = analytics.gir_percentage_by_hole(rounds)
    to_par = analytics.hole_to_par_nines(by_hole)
    greens = analytics.gir_percentage_nines(gir_by_hole)
    best, worst = record["best_round"], record["worst_round"]
    return CourseAnalyticsResponse(
        course_id=course_id,
        rounds_played=record["rounds_played"],
        last_played=record["last_played"],
        scoring_average=record["scoring_average"],
        scoring_average_to_par=record["scoring_average_to_par"],
        best_round_id=str(best.id) if best and best.id else None,
        worst_round_id=str(worst.id) if worst and worst.id else None,
        rounds=[round_summary(r) for r in newest_first],
        average_score_relative_to_par_by_hole=by_hole,
        gir_percentage_by_hole=gir_by_hole,
        hole_to_par_front_nine=to_par["front_nine"],
        hole_to_par_back_nine=to_par["back_nine"],
        hole_to_par_total=to_par["total"],
        gir_front_nine=greens["front_nine"],
        gir_back_nine=greens["back_nine"],
        gir_total=greens["total"],
    )
