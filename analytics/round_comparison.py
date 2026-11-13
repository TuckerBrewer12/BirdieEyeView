"""One round against the golfer's average: round detail's "vs your average".

Each figure is set against its average over the rounds played before this one: the last five,
the last twenty, or all of them. The round itself stays out of its own average, so a round is
measured against the form it was played on. A round with no earlier rounds has no averages.
"""

from typing import Any, Callable, Dict, List, Literal, Optional

from analytics import stats
from analytics.verdicts import change_verdict
from models import Round

ComparisonWindow = Literal["l5", "l20", "all"]
ComparisonMetric = Literal["score", "putts", "greens", "three_putts", "putts_per_gir", "scrambling"]

WINDOWS: List[tuple[ComparisonWindow, Optional[int]]] = [("l5", 5), ("l20", 20), ("all", None)]

# Each figure: the per-round rows it comes from, the key in them, whether lower is better, and its
# decimals (a count averages to a tenth; putts per green to a hundredth).
_Rows = Callable[[List[Round]], List[Dict[str, Any]]]
METRICS: List[tuple[ComparisonMetric, _Rows, str, bool, int]] = [
    ("score", stats.score_trend, "total_score", True, 1),
    ("putts", stats.putts_per_round, "total_putts", True, 1),
    ("greens", stats.gir_per_round, "total_gir", False, 1),
    ("three_putts", stats.three_putts_per_round, "three_putt_count", True, 1),
    ("putts_per_gir", stats.putts_per_gir, "putts_per_gir", True, 2),
    ("scrambling", stats.scrambling_per_round, "scramble_successes", False, 1),
]


def _metric(
    key: ComparisonMetric,
    values: List[Optional[float]],
    round_index: int,
    window: Optional[int],
    lower_is_better: bool,
    digits: int,
) -> Dict[str, Any]:
    earlier = values[:round_index]
    if window is not None:
        earlier = earlier[-window:]
    value = values[round_index]
    known = [v for v in earlier if v is not None]
    average = sum(known) / len(known) if known else None
    shown_value = stats.round_half_up(value, digits) if value is not None else None
    shown_average = stats.round_half_up(average, digits) if average is not None else None
    difference = (
        stats.round_half_up(shown_value - shown_average, digits)
        if shown_value is not None and shown_average is not None
        else None
    )
    return {
        "metric": key,
        "value": shown_value,
        "average": shown_average,
        "difference": difference,
        "verdict": change_verdict(difference, lower_is_better),
    }


def round_vs_average(rounds: List[Round], round_index: int) -> Dict[str, Any]:
    """The round at `round_index` (rounds oldest first) against each window of the rounds before it.

    Each window carries how many rounds it averaged and, per figure, this round's value, the
    average, the difference (this round less the average, at the figure's decimals) and whether
    that difference is good, bad or neutral for the golfer.
    """
    series = [
        (key, [row.get(field) for row in rows(rounds)], lower, digits)
        for key, rows, field, lower, digits in METRICS
    ]
    windows = []
    for name, size in WINDOWS:
        earlier = round_index if size is None else min(size, round_index)
        windows.append({
            "window": name,
            "rounds": earlier,
            "metrics": [
                _metric(key, values, round_index, size, lower, digits)
                for key, values, lower, digits in series
            ],
        })
    return {"windows": windows}
