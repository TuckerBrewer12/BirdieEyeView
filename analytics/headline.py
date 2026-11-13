"""The analytics page's headline: five figures, each with how the last five rounds moved it and its
five-round average after each round.

Every function takes the rounds oldest first. A figure's move is the last five rounds' average less
every round's, over the rounds that have it, so a round without putts recorded neither drags the
putts down nor counts toward the five.
"""

from typing import Any, Dict, List, Optional

from analytics import stats as analytics
from analytics.verdicts import change_verdict
from models import Round

RECENT_ROUNDS = 5

# Each figure, whether it improves as it falls, and the digits its move is shown to: percentages
# whole, the rest to a tenth.
METRICS = (
    ("scoring_average", True, 1),
    ("gir_percentage", False, 0),
    ("average_putts", True, 1),
    ("scrambling_percentage", False, 0),
    ("three_putt_rate", True, 0),
)


def _average(values: List[float]) -> float:
    return sum(values) / len(values)


def headline_figure(
    metric: str, value: Optional[float], series: List[Optional[float]], lower_is_better: bool, digits: int
) -> Dict[str, Any]:
    """One headline figure: `value`, the move in `series` (one entry a round, null where the round
    has none), its verdict, and the series' five-round average after each round that has it."""
    recorded = [v for v in series if v is not None]
    change: Optional[float] = None
    if len(recorded) >= RECENT_ROUNDS:
        change = analytics.round_half_up(_average(recorded[-RECENT_ROUNDS:]) - _average(recorded), digits)
    return {
        "metric": metric,
        "value": value,
        "change": change,
        "verdict": change_verdict(change, lower_is_better),
        "trend": analytics.rolling_average(recorded, RECENT_ROUNDS),
    }


def headline(rounds: List[Round], kpis: Dict[str, Optional[float]]) -> List[Dict[str, Any]]:
    """The five headline figures over `rounds`, valued as the page's KPIs (`kpis`) report them."""
    series: Dict[str, List[Optional[float]]] = {
        "scoring_average": [r.calculate_total_score() for r in rounds],
        "gir_percentage": [row["gir_percentage"] for row in analytics.gir_per_round(rounds)],
        "average_putts": [row["total_putts"] for row in analytics.putts_per_round(rounds)],
        "scrambling_percentage": [row["scrambling_percentage"] for row in analytics.scrambling_per_round(rounds)],
        "three_putt_rate": [
            row["three_putt_percentage"] if row["holes_with_putt_data"] else None
            for row in analytics.three_putts_per_round(rounds)
        ],
    }
    return [
        headline_figure(metric, kpis.get(metric), series[metric], lower_is_better, digits)
        for metric, lower_is_better, digits in METRICS
    ]
