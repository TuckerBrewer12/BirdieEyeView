"""The analytics page's response, built in one place from the player's rounds."""

from datetime import date
from typing import Any, Dict, List, Optional

from analytics import dashboard
from analytics import handicap as hcap
from analytics import stats as analytics
from analytics.benchmarks import player_shape
from analytics.insights import insights
from analytics.peak import peak_game
from api.round_responses import round_summary
from api.schemas import AnalyticsKpis, AnalyticsResponse
from models import Round, User


def _rounded(value: Optional[float], digits: int) -> Optional[float]:
    return round(value, digits) if value is not None else None


def _average(values: List[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


def _handicap_trend(user: Optional[User], history: List[Round], rounds: List[Round]) -> List[Dict[str, Any]]:
    """The golfer's index after each of `rounds`, read off their whole `history`, so a page
    narrowed to a course or a timeframe still shows the golfer's own index after each round.
    A round older than the history read has no index there (round_index 0)."""
    trend = hcap.player_handicap_trend(user, history)
    position = {r.id: i for i, r in enumerate(history) if r.id is not None}
    return [
        trend[position[r.id]] if r.id in position else {
            "round_index": 0, "round_id": r.id, "handicap_index": None, "differential": None,
            "used_in_hi": None, "hi_threshold": None, "differential_status": "unrated",
        }
        for r in rounds
    ]


def analytics_response(
    rounds: List[Round],
    history: List[Round],
    home_course_id: Optional[str] = None,
    today: Optional[date] = None,
    user: Optional[User] = None,
) -> AnalyticsResponse:
    """Every analytics section over `rounds` (oldest first). `history` is the golfer's own rounds,
    unfiltered and oldest first, ending with their latest and reaching back at least 19 rounds
    before `rounds`: their index (`api/player_handicap.py`, held at the handicap `user` gave) and
    its trend read it, whatever narrowed `rounds`. Net scores are off that index, so they match
    each round's page. The records' last year ends `today`, now unless given."""
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    score_rows = analytics.score_trend_with_rolling_average(rounds)
    gir_rows = analytics.gir_per_round(rounds)
    putts_rows = analytics.putts_per_round(rounds)
    scoring_by_par = analytics.scoring_by_par(rounds)
    scrambling_rows = analytics.scrambling_per_round(rounds)
    up_and_down_rows = analytics.up_and_down_trend(rounds)
    player_index = hcap.player_handicap_index(user, history)
    # Newest first, so a tie goes to the newest, as on the round list and the dashboard.
    best_round = analytics.best_round(list(reversed(rounds)))
    best = round_summary(best_round) if best_round else None
    average_putts = _average([r["total_putts"] for r in putts_rows if r["total_putts"] is not None])
    three_putts = analytics.three_putt_averages(rounds)
    shape = player_shape(rounds) or {}
    scoring_change = dashboard.scoring_average_change(rounds, full_window=True)

    return AnalyticsResponse(
        kpis=AnalyticsKpis(
            scoring_average=_rounded(_average(scores), 1),
            gir_percentage=shape.get("gir_percentage"),
            putts_per_gir=shape.get("putts_per_gir"),
            scrambling_percentage=shape.get("scrambling_percentage"),
            up_and_down_percentage=_rounded(_average([
                r["percentage"] for r in up_and_down_rows if r["opportunities"] > 0
            ]), 1),
            handicap_index=player_index,
            total_rounds=len(rounds),
            best_round=best.total_score if best else None,
            best_round_id=best.id if best else None,
            best_round_course=best.course_name if best else None,
            average_putts=analytics.round_half_up(average_putts) if average_putts is not None else None,
            three_putts_per_round=three_putts["per_round"],
            three_putt_rate=three_putts["rate"],
            scoring_average_change=scoring_change,
            scoring_average_verdict=dashboard.change_verdict(scoring_change),
        ),
        score_trend=score_rows,
        net_score_trend=analytics.net_score_trend(rounds, player_index),
        gir_trend=gir_rows,
        putts_trend=putts_rows,
        three_putts_trend=analytics.three_putts_per_round(rounds),
        scrambling_trend=scrambling_rows,
        up_and_down_trend=up_and_down_rows,
        scoring_by_par=scoring_by_par,
        scoring_by_yardage=analytics.scoring_by_yardage_buckets(rounds),
        scoring_by_handicap=analytics.scoring_vs_hole_handicap(rounds),
        gir_vs_non_gir=analytics.gir_vs_non_gir_score_distribution(rounds),
        handicap_trend=_handicap_trend(user, history, rounds),
        score_differentials=hcap.score_differentials_per_round(rounds),
        notable_achievements=analytics.notable_achievements(
            rounds, reference_date=today, home_course_id=home_course_id
        ),
        score_mix={
            kind: analytics.round_half_up(share, 2) for kind, share in dashboard.score_mix(rounds)["percentages"].items()
        },
        insights=insights(score_rows, gir_rows, scoring_by_par, putts_rows),
        peak_game=peak_game(rounds),
    )
