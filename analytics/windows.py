from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from analytics.handicap import round_half_up
from models.round import Round

RECORDS_WINDOW_DAYS = 365


def in_window(
    round_obj: Round,
    *,
    reference_date: Optional[date] = None,
    days: int = RECORDS_WINDOW_DAYS,
) -> bool:
    today = reference_date or datetime.now(timezone.utc).date()
    if round_obj.date is None:
        return False
    return today - timedelta(days=days) <= round_obj.date.date() <= today


def rolling_average(values: List[Optional[float]], window: int = 5) -> List[Optional[float]]:
    averages: List[Optional[float]] = []
    for i in range(len(values)):
        recent = [v for v in values[max(0, i - window + 1):i + 1] if v is not None]
        averages.append(round_half_up(sum(recent) / len(recent), 1) if recent else None)
    return averages


def with_rolling_average(rows: List[Dict[str, Any]], key: str, window: int = 5) -> List[Dict[str, Any]]:
    recorded = [row[key] for row in rows if row[key] is not None]
    averages = iter(rolling_average(recorded, window))
    return [{**row, "rolling_average": next(averages) if row[key] is not None else None} for row in rows]
