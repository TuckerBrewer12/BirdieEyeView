from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.greens import gir_per_round, scrambling_per_round
from analytics.putting import putts_per_gir, putts_per_round, three_putts_per_round
from analytics.scoring import score_trend
from models.round import Round


def _resolve_round_index(rows: List[Dict[str, Any]], round_index: Optional[int]) -> int:
    if not rows:
        raise ValueError("At least one round is required")
    if round_index is None:
        return len(rows) - 1
    if round_index < 0:
        round_index = len(rows) + round_index
    if round_index < 0 or round_index >= len(rows):
        raise IndexError("round_index out of range")
    return round_index


def _average_non_null(values: List[Optional[float]]) -> Optional[float]:
    filtered = [value for value in values if value is not None]
    if not filtered:
        return None
    return sum(filtered) / len(filtered)


def metric_comparison_snapshot(
    rows: List[Dict[str, Any]],
    *,
    primary_key: str,
    secondary_key: Optional[str] = None,
    round_index: Optional[int] = None,
    windows: tuple[int, ...] = (5, 10, 20),
    selected_label: str = "Selected Round",
) -> List[Dict[str, Any]]:
    target_index = _resolve_round_index(rows, round_index)
    history = rows[: target_index + 1]
    target_row = history[-1]

    result_rows: List[Dict[str, Any]] = [
        {
            "label": selected_label,
            "sample_size": 1,
            "observations": 1 if target_row.get(primary_key) is not None else 0,
            "round_id": target_row.get("round_id"),
            "primary_value": target_row.get(primary_key),
            "secondary_value": target_row.get(secondary_key) if secondary_key else None,
        }
    ]

    for window in windows:
        window_rows = history[-window:]
        primary_avg = _average_non_null([row.get(primary_key) for row in window_rows])
        secondary_avg = (
            _average_non_null([row.get(secondary_key) for row in window_rows])
            if secondary_key
            else None
        )
        result_rows.append(
            {
                "label": f"Last {window} Avg",
                "sample_size": len(window_rows),
                "observations": sum(1 for row in window_rows if row.get(primary_key) is not None),
                "round_id": None,
                "primary_value": primary_avg,
                "secondary_value": secondary_avg,
            }
        )

    return result_rows


def _comparable_rows(rounds: List[Round], rows: List[Dict[str, Any]], round_index: Optional[int],
                     keys: tuple[str, ...]) -> List[Dict[str, Any]]:
    if not rows:
        return rows
    target = rounds[_resolve_round_index(rows, round_index)]
    holes = el.round_format(target)
    comparable = []
    for round_obj, row in zip(rounds, rows):
        if round_obj.is_complete() and el.round_format(round_obj) == holes:
            comparable.append(row)
        else:
            comparable.append({**row, **{key: None for key in keys}})
    return comparable


def _compare(rounds: Iterable[Round], rows_fn, round_index: Optional[int], primary: str,
             secondary: Optional[str] = None) -> List[Dict[str, Any]]:
    rounds = list(rounds)
    keys = (primary,) + ((secondary,) if secondary else ())
    return metric_comparison_snapshot(
        _comparable_rows(rounds, rows_fn(rounds), round_index, keys),
        primary_key=primary,
        secondary_key=secondary,
        round_index=round_index,
        selected_label="Selected Round",
    )


def score_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, score_trend, round_index, "total_score", "to_par")


def putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, putts_per_round, round_index, "total_putts")


def three_putts_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, three_putts_per_round, round_index, "three_putt_count", "three_putt_percentage")


def scrambling_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, scrambling_per_round, round_index, "scramble_successes", "scrambling_percentage")


def gir_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, gir_per_round, round_index, "total_gir", "gir_percentage")


def putts_per_gir_comparison(rounds: Iterable[Round], round_index: Optional[int] = None) -> List[Dict[str, Any]]:
    return _compare(rounds, putts_per_gir, round_index, "putts_per_gir", "putts_on_gir")
