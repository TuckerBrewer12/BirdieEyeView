"""A player's peak game: their best few rounds, and what those rounds did differently.

The Lab sets the peak against the player's goal and draws its shape behind theirs.
Every function takes the rounds oldest first.
"""

from typing import Any, Dict, List, Literal, Optional, Tuple

from analytics.stats import best_round_ranks, full_rounds, round_half_up
from models import Round

PEAK_ROUNDS = 3
# Two rounds are the fewest a peak can be told from the rest with.
PEAK_MIN_ROUNDS = 2

ImpactKind = Literal["birdies", "bogeys", "doubles"]

# What a hole of each kind is worth against par: a birdie gains a stroke, a bogey loses one,
# and a double or worse is counted at two.
STROKES_PER_HOLE: Dict[ImpactKind, int] = {"birdies": 1, "bogeys": -1, "doubles": -2}


def _course_name(round_: Round) -> Optional[str]:
    return round_.course.name if round_.course else round_.course_name_played


def _per_round(rounds: List[Round]) -> Optional[Dict[ImpactKind, float]]:
    """Birdies, bogeys and doubles or worse a round, over the rounds with a hole that has a par.
    Null when none has one."""
    counted = [counts for counts in (r.get_score_counts() for r in rounds) if counts]
    if not counted:
        return None
    totals: Dict[ImpactKind, float] = {
        "birdies": sum(c.get("birdie", 0) for c in counted),
        "bogeys": sum(c.get("bogey", 0) for c in counted),
        "doubles": sum(c.get("double", 0) + c.get("triple", 0) + c.get("quad", 0) for c in counted),
    }
    return {kind: total / len(counted) for kind, total in totals.items()}


def _peak(rounds: List[Round]) -> List[Tuple[Round, int]]:
    """The best full rounds with their scores, best first, ranked as the round list ranks them
    (`best_round_ranks`, lowest to par); on a tie the older round comes first. A nine is never
    in the peak. Empty under two scored full rounds."""
    scored: List[Tuple[Round, int]] = []
    for r in full_rounds(rounds):
        score = r.calculate_total_score()
        if score is not None:
            scored.append((r, score))
    ranks = best_round_ranks([r for r, _ in scored])
    if len(ranks) < PEAK_MIN_ROUNDS:
        return []
    return [scored[i] for i in sorted(ranks, key=ranks.__getitem__)[:PEAK_ROUNDS]]


def peak_rounds(rounds: List[Round]) -> List[Round]:
    """The best full rounds, best first; on a tie the older round comes first.
    Empty under two scored full rounds."""
    return [r for r, _ in _peak(rounds)]


def peak_average(rounds: List[Round]) -> Optional[float]:
    """The peak rounds' average score, unrounded. Null under two scored full rounds."""
    best = _peak(rounds)
    if not best:
        return None
    return sum(score for _, score in best) / len(best)


def peak_impacts(rounds: List[Round]) -> List[Dict[str, Any]]:
    """Birdies, bogeys and doubles a round in the peak rounds against every round, and the
    strokes a round each difference is worth: positive when the peak rounds gain them.
    Each to a hundredth. Empty without a peak or a hole with a par."""
    peak = _per_round(peak_rounds(rounds))
    every = _per_round(rounds)
    if peak is None or every is None:
        return []
    return [
        {
            "kind": kind,
            "peak": round_half_up(peak[kind], 2),
            "average": round_half_up(every[kind], 2),
            "strokes": round_half_up((peak[kind] - every[kind]) * STROKES_PER_HOLE[kind], 2),
        }
        for kind in STROKES_PER_HOLE
    ]


def peak_game(rounds: List[Round]) -> Optional[Dict[str, Any]]:
    """The best three rounds, their average to a tenth, and what they did differently.
    Null under two scored full rounds."""
    best = _peak(rounds)
    if not best:
        return None
    return {
        "rounds": [
            {"round_id": r.id, "course_name": _course_name(r), "score": score}
            for r, score in best
        ],
        "average": round_half_up(sum(score for _, score in best) / len(best), 1),
        "impacts": peak_impacts(rounds),
    }


def peak_gap(rounds: List[Round], scoring_goal: int) -> Optional[float]:
    """The peak average less the goal, to a tenth: at or under 0 when the best rounds already meet it."""
    average = peak_average(rounds)
    return round_half_up(average - scoring_goal, 1) if average is not None else None


def peak_meets_goal(rounds: List[Round], scoring_goal: int) -> Optional[bool]:
    """Whether the peak rounds' average is at or under the goal. Null without a peak."""
    average = peak_average(rounds)
    return average <= scoring_goal if average is not None else None
