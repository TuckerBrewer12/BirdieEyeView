from typing import Any, Dict, List, Literal, Optional, Tuple

from analytics.stats import round_half_up
from models import Round

PEAK_ROUNDS = 3
PEAK_MIN_ROUNDS = 2

ImpactKind = Literal["birdies", "bogeys", "doubles"]

STROKES_PER_HOLE: Dict[ImpactKind, int] = {"birdies": 1, "bogeys": -1, "doubles": -2}


def _course_name(round_: Round) -> Optional[str]:
    return round_.course.name if round_.course else round_.course_name_played


def _per_round(rounds: List[Round]) -> Optional[Dict[ImpactKind, float]]:
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
    scored: List[Tuple[Round, int]] = []
    for r in rounds:
        score = r.calculate_total_score()
        if score is not None:
            scored.append((r, score))
    if len(scored) < PEAK_MIN_ROUNDS:
        return []
    return sorted(scored, key=lambda pair: pair[1])[:PEAK_ROUNDS]


def peak_rounds(rounds: List[Round]) -> List[Round]:
    return [r for r, _ in _peak(rounds)]


def peak_average(rounds: List[Round]) -> Optional[float]:
    best = _peak(rounds)
    if not best:
        return None
    return sum(score for _, score in best) / len(best)


def peak_impacts(rounds: List[Round]) -> List[Dict[str, Any]]:
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
    average = peak_average(rounds)
    return round_half_up(average - scoring_goal, 1) if average is not None else None


def peak_meets_goal(rounds: List[Round], scoring_goal: int) -> Optional[bool]:
    average = peak_average(rounds)
    return average <= scoring_goal if average is not None else None
