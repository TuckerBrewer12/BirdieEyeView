"""What stands out in a player's rounds, for the analytics page to put into words.

Each insight is a fact and the figures behind it: which way it points (`trend`) and, for an
average, how good it is (`rating`). The page words it; the judgement is made here.
Every function takes the trend rows the analytics response already builds, oldest first.
"""

from typing import Any, Dict, List, Literal, Optional

Trend = Literal["up", "down", "flat"]
Rating = Literal["strong", "fair", "weak"]

# A scoring shift needs this many rounds, so each half has three.
SCORING_SHIFT_MIN_ROUNDS = 6
# Smaller moves than these are noise.
SCORING_SHIFT_MIN_STROKES = 0.3
GIR_SHIFT_MIN_POINTS = 1.0
PUTTS_SHIFT_MIN_PUTTS = 0.5
# A GIR or putts shift needs this many rounds with the figure recorded.
SHIFT_MIN_ROUNDS = 4


def _mean(values: List[float]) -> float:
    return sum(values) / len(values)


def _halves_change(values: List[float]) -> Optional[float]:
    """The later half's average less the earlier half's. An odd one out goes to the later half."""
    mid = len(values) // 2
    earlier, later = values[:mid], values[mid:]
    if not earlier or not later:
        return None
    return _mean(later) - _mean(earlier)


def gir_rating(percent: float) -> Rating:
    """Greens hit per round: over half is strong ball striking, under a third is the place to work."""
    if percent >= 55:
        return "strong"
    return "fair" if percent >= 33 else "weak"


def putts_rating(putts: float) -> Rating:
    """Putts per round: 30 or fewer is strong, over 34 costs strokes."""
    if putts <= 30:
        return "strong"
    return "fair" if putts <= 34 else "weak"


def _scoring_shift(score_trend: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The earlier half of the rounds' scoring average less the later half's: positive when scores came down."""
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
    """The par type the player scores best on, against par."""
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
    """The average of each round's GIR%, and how far it moved from the earlier half of the rounds to the later."""
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
    """Putts per round, and how far they came down from the earlier half of the rounds to the later."""
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
            # Positive when putts came down.
            found.append({"kind": "putts_shift", "category": "putting", "trend": "down" if change < 0 else "up", "putts": -change})
    return found


def insights(
    score_trend: List[Dict[str, Any]],
    gir_trend: List[Dict[str, Any]],
    scoring_by_par: List[Dict[str, Any]],
    putts_trend: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Every insight the rounds support, scoring first, then greens, then putting."""
    found = [_scoring_shift(score_trend), _best_par(scoring_by_par)]
    return [insight for insight in found if insight is not None] + _gir(gir_trend) + _putts(putts_trend)
