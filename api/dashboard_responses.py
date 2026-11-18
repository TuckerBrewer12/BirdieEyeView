from datetime import date
from typing import List

from analytics import best_rounds
from analytics import dashboard
from analytics import eligibility as el
from analytics import handicap as hcap
from analytics import scoring
from analytics import verdicts
from analytics import windows
from api.round_responses import round_summary
from api.schemas import DashboardResponse
from models import Round, User
from models.hole import HOLES_PER_NINE, HOLES_PER_ROUND


def dashboard_response(user: User, summaries: List[Round], history: List[Round], today: date) -> DashboardResponse:
    eighteen = dashboard.format_totals(summaries, HOLES_PER_ROUND)
    nine = dashboard.format_totals(summaries, HOLES_PER_NINE)

    best = best_rounds.best_round(summaries)
    best_summary = round_summary(best) if best else None

    hi_rounds = el.chronological(history)
    last_20 = best_rounds.full_rounds(hi_rounds)[-20:]
    index_window = hcap.player_index_window(user, hi_rounds)
    full_trend = hcap.player_handicap_trend(user, hi_rounds)
    by_identity = {id(r): entry for r, entry in zip(hi_rounds, full_trend)}
    handicap_trend = [by_identity[id(r)] for r in last_20]
    whs_rounds = [r for i, r in enumerate(hi_rounds) if i in index_window["eligible"]]
    whs_trend = [by_identity[id(r)] for r in whs_rounds]
    scoring_change = dashboard.scoring_average_change(last_20)

    return DashboardResponse(
        total_rounds=len(summaries), scoring_average=eighteen["average"],
        average_putts=eighteen["average_putts"], average_gir=eighteen["average_gir"],
        scoring_average_nine=nine["average"], best_round_nine=nine["best"],
        best_round_nine_id=nine["best_id"], best_round_nine_course=nine["best_course"],
        average_putts_nine=nine["average_putts"], average_gir_nine=nine["average_gir"],
        best_round=eighteen["best"],
        best_round_id=best_summary.id if best_summary else None,
        best_round_course=best_summary.course_name if best_summary else None,
        best_round_to_par=best_summary.to_par if best_summary else None,
        best_round_date=best_summary.date if best_summary else None,
        handicap_index=index_window["index"],
        recent_rounds=[round_summary(r) for r in summaries[:4]],
        scoring_average_l5=dashboard.scoring_average(last_20, dashboard.RECENT_ROUNDS),
        scoring_average_change=scoring_change,
        scoring_average_verdict=verdicts.change_verdict(scoring_change),
        handicap_change=dashboard.handicap_change(last_20, handicap_trend, today),
        recent_score_mix=dashboard.score_mix(last_20[-dashboard.RECENT_ROUNDS:])["percentages"],
        whs=dashboard.whs_breakdown(
            whs_rounds, whs_trend, hcap.score_differentials_per_round(whs_rounds), index_window
        ),
        score_trend=scoring.score_trend_with_rolling_average(last_20),
        handicap_trend=[
            {**row, "in_window": windows.in_window(r, reference_date=today)}
            for r, row in zip(last_20, handicap_trend)
        ],
        rounds_this_year=dashboard.rounds_this_year(summaries, today),
    )
