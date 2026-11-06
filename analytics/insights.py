from typing import Any, Dict, List, Literal, Optional

Trend = Literal["up", "down", "flat"]
Rating = Literal["strong", "fair", "weak"]

SCORING_SHIFT_MIN_ROUNDS = 6
SCORING_SHIFT_MIN_STROKES = 0.3
GIR_SHIFT_MIN_POINTS = 1.0
PUTTS_SHIFT_MIN_PUTTS = 0.5
SHIFT_MIN_ROUNDS = 4


def _mean(values: List[float]) -> float:
    return sum(values) / len(values)


def _halves_change(values: List[float]) -> Optional[float]:
    mid = len(values) // 2
    earlier, later = values[:mid], values[mid:]
    if not earlier or not later:
        return None
    return _mean(later) - _mean(earlier)


def gir_rating(percent: float) -> Rating:
    if percent >= 55:
        return "strong"
    return "fair" if percent >= 33 else "weak"


def putts_rating(putts: float) -> Rating:
    if putts <= 30:
        return "strong"
    return "fair" if putts <= 34 else "weak"


def _scoring_shift(score_trend: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if len(score_trend) < SCORING_SHIFT_MIN_ROUNDS:
        return None
    mid = len(score_trend) // 2
    earlier = [row["total_score"] for row in score_trend[:mid] if row["total_score"] is not None]
    later = [row["total_score"] for row in score_trend[mid:] if row["total_score"] is not None]
    if not earlier or not later:
        return None
    strokes = _mean(earlier) - _mean(later)
    if abs(strokes) < SCORING_SHIFT_MIN_STROKES:
        return None
    return {
        "kind": "scoring_shift",
        "category": "scoring",
        "trend": "down" if strokes > 0 else "up",
        "strokes": strokes,
        "rounds": len(score_trend),
    }


def _best_par(scoring_by_par: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not scoring_by_par:
        return None
    best = min(scoring_by_par, key=lambda row: row["average_to_par"])
    return {
        "kind": "best_par",
        "category": "scoring",
        "trend": "down" if best["average_to_par"] <= 0 else "flat",
        "par": best["par"],
        "average_to_par": best["average_to_par"],
        "holes": best["sample_size"],
    }


def _gir(gir_trend: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rates = [row["gir_percentage"] for row in gir_trend if row["gir_percentage"] is not None]
    found: List[Dict[str, Any]] = []
    if rates:
        percent = _mean(rates)
        found.append({
            "kind": "gir_average",
            "category": "gir",
            "trend": "up" if percent >= 50 else "flat",
            "rating": gir_rating(percent),
            "percent": percent,
        })
    if len(rates) >= SHIFT_MIN_ROUNDS:
        points = _halves_change(rates)
        if points is not None and abs(points) >= GIR_SHIFT_MIN_POINTS:
            found.append({"kind": "gir_shift", "category": "gir", "trend": "up" if points > 0 else "down", "points": points})
    return found


def _putts(putts_trend: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    putts = [row["total_putts"] for row in putts_trend if row["total_putts"] is not None]
    found: List[Dict[str, Any]] = []
    if putts:
        average = _mean(putts)
        trend: Trend = "down" if average <= 32 else ("flat" if average <= 36 else "up")
        found.append({
            "kind": "putts_average",
            "category": "putting",
            "trend": trend,
            "rating": putts_rating(average),
            "putts": average,
        })
    if len(putts) >= SHIFT_MIN_ROUNDS:
        change = _halves_change(putts)
        if change is not None and abs(change) >= PUTTS_SHIFT_MIN_PUTTS:
            found.append({"kind": "putts_shift", "category": "putting", "trend": "down" if change < 0 else "up", "putts": -change})
    return found


def insights(
    score_trend: List[Dict[str, Any]],
    gir_trend: List[Dict[str, Any]],
    scoring_by_par: List[Dict[str, Any]],
    putts_trend: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    found = [_scoring_shift(score_trend), _best_par(scoring_by_par)]
    return [insight for insight in found if insight is not None] + _gir(gir_trend) + _putts(putts_trend)
