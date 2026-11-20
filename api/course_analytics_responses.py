from analytics import best_rounds
from analytics import holes
from analytics import scoring
from analytics.player_history import RoundWindow
from api.round_responses import round_summary
from api.schemas import CourseAnalyticsResponse


def course_analytics(course_id: str, window: RoundWindow) -> CourseAnalyticsResponse:
    rounds, newest_first = window.rounds, window.newest_first
    record = best_rounds.course_record(newest_first)
    by_hole = holes.average_score_relative_to_par_by_hole(rounds)
    gir_by_hole = holes.gir_percentage_by_hole(rounds)
    trended = best_rounds.full_rounds(rounds) or rounds
    to_par = holes.hole_to_par_nines(by_hole)
    greens = holes.gir_percentage_nines(gir_by_hole)
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
        score_trend=scoring.score_trend_with_rolling_average(trended),
        holes=holes.course_hole_stats(rounds),
        hole_to_par_front_nine=to_par["front_nine"],
        hole_to_par_back_nine=to_par["back_nine"],
        hole_to_par_total=to_par["total"],
        gir_front_nine=greens["front_nine"],
        gir_back_nine=greens["back_nine"],
        gir_total=greens["total"],
    )
