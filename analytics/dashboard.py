from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from analytics import stats as analytics
from analytics.verdicts import change_verdict
from models import Round

RECENT_ROUNDS = 5
SCORE_KINDS = analytics.SCORE_KINDS


def scoring_average(rounds: List[Round], window: Optional[int] = None) -> Optional[float]:
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    if window is not None:
        scores = scores[-window:]
    return sum(scores) / len(scores) if scores else None


def scoring_average_change(rounds: List[Round], window: int = RECENT_ROUNDS) -> Optional[float]:
    overall = scoring_average(rounds)
    recent = scoring_average(rounds, window)
    if overall is None or recent is None:
        return None
    return analytics.round_half_up(recent - overall, 1)


def score_mix(rounds: List[Round]) -> Dict[str, Any]:
    counts = {kind: 0 for kind in SCORE_KINDS}
    for round_ in rounds:
        for kind, count in round_.get_score_counts().items():
            counts[kind] += count
    holes = sum(counts.values())
    return {
        "percentages": {kind: (counts[kind] / holes * 100 if holes else 0.0) for kind in SCORE_KINDS},
        "holes": holes,
    }


def _round_day(round_: Round) -> Optional[date]:
    return round_.date.date() if round_.date is not None else None


def handicap_change_this_month(
    rounds: List[Round], handicap_trend: List[Dict[str, Any]], today: date
) -> Optional[float]:
    month_start = today.replace(day=1)
    before: Optional[float] = None
    for round_, row in zip(rounds, handicap_trend):
        day = _round_day(round_)
        if day is not None and day < month_start and row["handicap_index"] is not None:
            before = row["handicap_index"]
    indexes = [r["handicap_index"] for r in handicap_trend if r["handicap_index"] is not None]
    if before is None or not indexes:
        return None
    return round(indexes[-1] - before, 1)


def handicap_change(rounds: List[Round], handicap_trend: List[Dict[str, Any]], today: date) -> Dict[str, Any]:
    change = handicap_change_this_month(rounds, handicap_trend, today)
    return {"this_month": change, "this_month_verdict": change_verdict(change)}


def today() -> date:
    return datetime.now(timezone.utc).date()


def rounds_this_year(rounds: List[Round], today: date) -> int:
    return sum(1 for d in (_round_day(r) for r in rounds) if d is not None and d.year == today.year)


def whs_breakdown(
    rounds: List[Round],
    handicap_trend: List[Dict[str, Any]],
    differentials: List[Dict[str, Any]],
    index_window: Dict[str, Any],
) -> Dict[str, Any]:
    by_index = {d["round_index"]: d for d in differentials}
    score_rows = analytics.score_trend(rounds)
    rows = []
    for i, score_row in enumerate(score_rows):
        trend = handicap_trend[i] if i < len(handicap_trend) else {}
        diff = by_index.get(score_row["round_index"], {})
        rows.append({
            "round_index": score_row["round_index"],
            "course_name": score_row.get("course_name"),
            "course_rating": diff.get("course_rating"),
            "slope_rating": diff.get("slope_rating"),
            "score": diff.get("score") if diff.get("score") is not None else score_row.get("total_score"),
            "differential": trend.get("differential"),
            "used": trend.get("used_in_hi") is True,
        })
    rows.reverse()
    used = [r["differential"] for r in rows if r["used"] and r["differential"] is not None]
    return {
        "rows": rows,
        "window_size": index_window["rated"],
        "count_used": index_window["count"],
        "adjustment": index_window["adjustment"],
        "diff_avg": sum(used) / len(used) if used else None,
        "has_rated_rounds": any(d.get("course_rating") is not None for d in differentials),
    }
