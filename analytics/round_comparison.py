from typing import Any, Callable, Dict, List, Literal, Optional

from analytics import eligibility as el
from analytics import greens
from analytics import handicap
from analytics import putting
from analytics import scoring
from analytics.verdicts import change_verdict
from models import Round

ComparisonWindow = Literal["l5", "l20", "all"]
ComparisonMetric = Literal["score", "putts", "greens", "three_putts", "putts_per_gir", "scrambling"]

WINDOWS: List[tuple[ComparisonWindow, Optional[int]]] = [("l5", 5), ("l20", 20), ("all", None)]

_Rows = Callable[[List[Round]], List[Dict[str, Any]]]
METRICS: List[tuple[ComparisonMetric, _Rows, str, bool, int]] = [
    ("score", scoring.score_trend, "total_score", True, 1),
    ("putts", putting.putts_per_round, "total_putts", True, 1),
    ("greens", greens.gir_per_round, "total_gir", False, 1),
    ("three_putts", putting.three_putts_per_round, "three_putt_count", True, 1),
    ("putts_per_gir", putting.putts_per_gir, "putts_per_gir", True, 2),
    ("scrambling", greens.scrambling_per_round, "scramble_successes", False, 1),
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
    shown_value = handicap.round_half_up(value, digits) if value is not None else None
    shown_average = handicap.round_half_up(average, digits) if average is not None else None
    difference = (
        handicap.round_half_up(shown_value - shown_average, digits)
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
    selected = rounds[round_index]
    format_ = el.round_format(selected)
    earlier = [r for r in rounds[:round_index] if r.is_complete() and el.round_format(r) == format_ and format_ is not None]
    comparable = [*earlier, selected]
    round_index = len(earlier)
    series = [
        (key, [row.get(field) for row in rows(comparable)], lower, digits)
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
