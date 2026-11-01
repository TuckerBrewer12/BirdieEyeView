"""The analytics page's response, built in one place from the player's rounds."""

from typing import List, Optional

from analytics import handicap as hcap
from analytics import stats as analytics
from api.schemas import AnalyticsKpis, AnalyticsResponse
from models import Round


def _rounded(value: Optional[float], digits: int) -> Optional[float]:
    return round(value, digits) if value is not None else None


def _average(values: List[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


def analytics_response(
    rounds: List[Round],
    hi_rounds: List[Round],
    home_course_id: Optional[str] = None,
) -> AnalyticsResponse:
    """Every analytics section over `rounds` (oldest first). `hi_rounds` ends with the same rounds
    and reaches back up to 19 more, so the handicap trend has a full rolling window from the start."""
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    scrambling_rows = analytics.scrambling_per_round(rounds)
    up_and_down_rows = analytics.up_and_down_trend(rounds)
    current_hi = hcap.handicap_index(hi_rounds)

    return AnalyticsResponse(
        kpis=AnalyticsKpis(
            scoring_average=_rounded(_average(scores), 1),
            gir_percentage=_rounded(analytics.overall_gir_percentage(rounds)["gir_percentage"], 1),
            putts_per_gir=_rounded(analytics.overall_putts_per_gir(rounds)["putts_per_gir"], 2),
            scrambling_percentage=_rounded(_average([
                r["scrambling_percentage"] for r in scrambling_rows if r["scrambling_percentage"] is not None
            ]), 1),
            up_and_down_percentage=_rounded(_average([
                r["percentage"] for r in up_and_down_rows if r["opportunities"] > 0
            ]), 1),
            handicap_index=current_hi,
            total_rounds=len(rounds),
        ),
        score_trend=analytics.score_trend(rounds),
        net_score_trend=analytics.net_score_trend(rounds, current_hi),
        gir_trend=analytics.gir_per_round(rounds),
        putts_trend=analytics.putts_per_round(rounds),
        three_putts_trend=analytics.three_putts_per_round(rounds),
        scrambling_trend=scrambling_rows,
        up_and_down_trend=up_and_down_rows,
        score_type_distribution=analytics.score_type_distribution_per_round(rounds),
        scoring_by_par=analytics.scoring_by_par(rounds),
        scoring_by_yardage=analytics.scoring_by_yardage_buckets(rounds),
        scoring_by_handicap=analytics.scoring_vs_hole_handicap(rounds),
        gir_vs_non_gir=analytics.gir_vs_non_gir_score_distribution(rounds),
        handicap_trend=hcap.windowed_handicap_trend(hi_rounds, len(rounds)),
        score_differentials=hcap.score_differentials_per_round(rounds),
        notable_achievements=analytics.notable_achievements(rounds, home_course_id=home_course_id),
    )
