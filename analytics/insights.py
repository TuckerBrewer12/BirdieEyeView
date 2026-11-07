"""What stands out in a player's rounds, for the analytics page to put into words.

Each insight is a fact and the figures behind it: which way it points (`trend`) and, for an
average, how good it is (`rating`). The page words it; the judgement is made here. Every figure
is worked out as the analytics KPIs work it out (`analytics.stats`), so an insight's GIR% or
putts reads the same as the KPI beside it. Every function takes the rounds oldest first.
"""

from typing import Any, Dict, List, Literal, Optional

from analytics import stats
from models import Round

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


def _halves(rounds: List[Round]) -> tuple[List[Round], List[Round]]:
    """The earlier and later half of the rounds. An odd one out goes to the later half."""
    mid = len(rounds) // 2
    return rounds[:mid], rounds[mid:]


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


def _scoring_shift(rounds: List[Round]) -> Optional[Dict[str, Any]]:
    """The earlier half of the rounds' scoring average less the later half's: positive when scores came down."""
    if len(rounds) < SCORING_SHIFT_MIN_ROUNDS:
        return None
    earlier, later = (stats.scoring_average(half) for half in _halves(rounds))
    if earlier is None or later is None:
        return None
    strokes = stats.round_half_up(earlier - later)
    if abs(strokes) < SCORING_SHIFT_MIN_STROKES:
        return None
    return {
        "kind": "scoring_shift",
        "category": "scoring",
        "trend": "down" if strokes > 0 else "up",
        "strokes": strokes,
        "rounds": len(rounds),
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


def _gir(rounds: List[Round]) -> List[Dict[str, Any]]:
    """GIR% over the rounds (`stats.gir_percentage`), and how far it moved from the earlier half
    of the rounds that recorded it to the later."""
    recorded = [r for r in rounds if stats.gir_percentage([r]) is not None]
    found: List[Dict[str, Any]] = []
    percent = stats.gir_percentage(recorded)
    if percent is not None:
        found.append({
            "kind": "gir_average",
            "category": "gir",
            "trend": "up" if percent >= 50 else "flat",
            "rating": gir_rating(percent),
            "percent": percent,
        })
    earlier, later = (stats.gir_percentage(half) for half in _halves(recorded))
    if len(recorded) >= SHIFT_MIN_ROUNDS and earlier is not None and later is not None:
        points = stats.round_half_up(later - earlier)
        if abs(points) >= GIR_SHIFT_MIN_POINTS:
            found.append({"kind": "gir_shift", "category": "gir", "trend": "up" if points > 0 else "down", "points": points})
    return found


def _putts(rounds: List[Round]) -> List[Dict[str, Any]]:
    """Putts a round (`stats.average_putts`), and how far they came down from the earlier half of
    the rounds with putts to the later."""
    recorded = [r for r in rounds if r.get_total_putts() is not None]
    found: List[Dict[str, Any]] = []
    average = stats.average_putts(recorded)
    if average is not None:
        trend: Trend = "down" if average <= 32 else ("flat" if average <= 36 else "up")
        found.append({
            "kind": "putts_average",
            "category": "putting",
            "trend": trend,
            "rating": putts_rating(average),
            "putts": average,
        })
    earlier, later = (stats.average_putts(half) for half in _halves(recorded))
    if len(recorded) >= SHIFT_MIN_ROUNDS and earlier is not None and later is not None:
        change = stats.round_half_up(later - earlier)
        if abs(change) >= PUTTS_SHIFT_MIN_PUTTS:
            # Positive when putts came down.
            found.append({"kind": "putts_shift", "category": "putting", "trend": "down" if change < 0 else "up", "putts": -change})
    return found


def insights(rounds: List[Round], scoring_by_par: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Every insight the rounds support, scoring first, then greens, then putting."""
    found = [_scoring_shift(rounds), _best_par(scoring_by_par)]
    return [insight for insight in found if insight is not None] + _gir(rounds) + _putts(rounds)
