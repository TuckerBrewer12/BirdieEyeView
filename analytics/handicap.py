from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from models.hole import HOLES_PER_ROUND
from models.round import Round
from models.user import User

_WHS_TABLE: List[tuple[int, float]] = [
    (1, -2.0),
    (1, -1.0),
    (1, 0.0),
    (2, -1.0),
    (2, 0.0),
    (2, 0.0),
    (3, 0.0),
    (3, 0.0),
    (3, 0.0),
    (4, 0.0),
    (4, 0.0),
    (4, 0.0),
    (5, 0.0),
    (5, 0.0),
    (6, 0.0),
    (6, 0.0),
    (7, 0.0),
    (8, 0.0),
]


def whs_window(rated_rounds: int) -> tuple[int, float]:
    n = min(rated_rounds, 20)
    if n < 3:
        return 0, 0.0
    return _WHS_TABLE[min(n - 3, len(_WHS_TABLE) - 1)]


def score_differential(score: int, course_rating: float, slope_rating: float) -> float:
    return (score - course_rating) * 113.0 / slope_rating


def course_handicap(handicap_index: float, slope_rating: float, course_rating: float, par: int) -> int:
    return math.floor(handicap_index * slope_rating / 113 + (course_rating - par) + 0.5)


def tee_course_handicap(
    handicap_index: Optional[float],
    slope_rating: Optional[float],
    course_rating: Optional[float],
    par: Optional[int],
) -> Optional[int]:
    if handicap_index is None or slope_rating is None or course_rating is None or par is None:
        return None
    return course_handicap(handicap_index, slope_rating, course_rating, par)


def round_course_handicap(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    tee = round_obj.get_tee()
    if tee is None or round_obj.holes_played() < HOLES_PER_ROUND:
        return None
    return tee_course_handicap(handicap_index, tee.slope_rating, tee.course_rating, round_obj.get_par())


def round_net_score(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    gross = round_obj.calculate_total_score()
    strokes = round_course_handicap(round_obj, handicap_index)
    if gross is None or strokes is None:
        return None
    return gross - strokes


def _get_differential_for_round(round_obj: Round) -> Optional[float]:
    total = round_obj.calculate_total_score()
    if total is None:
        return None

    holes_played = round_obj.holes_played()

    tee = round_obj.get_tee()
    if tee is not None and tee.course_rating is not None and tee.slope_rating is not None:
        if holes_played < HOLES_PER_ROUND and tee.course_rating >= 50.0:
            return None
        return score_differential(total, tee.course_rating, tee.slope_rating)

    par = round_obj.get_par()
    if par is None:
        return None
    if holes_played < HOLES_PER_ROUND and par >= 50:
        return None
    return float(total - par)


def score_differentials_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        diff = _get_differential_for_round(round_obj)
        tee = round_obj.get_tee()
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "score": round_obj.calculate_total_score(),
                "course_rating": tee.course_rating if tee else None,
                "slope_rating": tee.slope_rating if tee else None,
                "differential": round(diff, 1) if diff is not None else None,
            }
        )
    return results


WHS_ROUNDS = 20


def _eligible(
    rounds: List[Round],
    diffs: List[Optional[float]],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Tuple[int, float]]:
    rated = [(i, d) for i, d in enumerate(diffs) if d is not None]
    if seed_handicap is None:
        return rated
    if seed_set_at is not None:
        cutoff: date = seed_set_at.date()
        eligible: List[Tuple[int, float]] = []
        for i, d in rated:
            played = rounds[i].date
            day = played.date() if isinstance(played, datetime) else played
            if day is None or day >= cutoff or d < seed_handicap:
                eligible.append((i, d))
        return eligible
    return [(i, d) for k, (i, d) in enumerate(rated) if k >= transition_rounds or d < seed_handicap]


def _eligible_differentials(
    rounds: List[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[float]:
    diffs = [_get_differential_for_round(r) for r in rounds]
    return [d for _, d in _eligible(
        rounds, diffs, seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at,
    )]


def _index_window(
    rounds: List[Round],
    diffs: List[Optional[float]],
    use_last_n: int = WHS_ROUNDS,
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    eligible = _eligible(
        rounds, diffs, seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at,
    )[-use_last_n:]
    n = len(eligible)
    window: Dict[str, Any] = {
        "index": None, "counting": set(), "threshold": None, "rated": n, "count": 0, "adjustment": 0.0,
    }
    if n < 3:
        if seed_handicap is not None:
            window["index"] = round(min([seed_handicap] + [d for _, d in eligible]), 1)
        return window

    count, adjustment = whs_window(n)
    ranked = sorted(eligible, key=lambda pair: (pair[1], -pair[0]))
    best = ranked[:count]
    hi = min(sum(d for _, d in best) / count + adjustment, 54.0)
    window.update(
        index=round(hi, 1),
        counting={i for i, _ in best},
        threshold=ranked[count - 1][1],
        count=count,
        adjustment=adjustment,
    )
    return window


def index_window(
    rounds: Iterable[Round],
    use_last_n: int = WHS_ROUNDS,
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    all_rounds = list(rounds)
    return _index_window(
        all_rounds,
        [_get_differential_for_round(r) for r in all_rounds],
        use_last_n,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )


def handicap_index(
    rounds: Iterable[Round],
    use_last_n: int = WHS_ROUNDS,
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> Optional[float]:
    return index_window(
        rounds,
        use_last_n,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )["index"]


def _seed(user: Optional[User]) -> Dict[str, Any]:
    if user is None:
        return {"seed_handicap": None, "seed_set_at": None}
    return {"seed_handicap": user.handicap, "seed_set_at": user.last_handicap_update}


def player_index_window(user: Optional[User], rounds: Iterable[Round]) -> Dict[str, Any]:
    return index_window(list(rounds)[-WHS_ROUNDS:], **_seed(user))


def player_handicap_index(user: Optional[User], rounds: Iterable[Round]) -> Optional[float]:
    return player_index_window(user, rounds)["index"]


def handicap_trend(
    rounds: Iterable[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    all_rounds = list(rounds)
    diffs = [_get_differential_for_round(r) for r in all_rounds]
    results: List[Dict[str, Any]] = []
    for i, round_obj in enumerate(all_rounds, start=1):
        start = max(0, i - WHS_ROUNDS)
        hi = _index_window(
            all_rounds[start:i],
            diffs[start:i],
            seed_handicap=seed_handicap,
            transition_rounds=transition_rounds,
            seed_set_at=seed_set_at,
        )["index"]
        this_diff = diffs[i - 1]
        results.append(
            {
                "round_index": i,
                "round_id": round_obj.id,
                "handicap_index": hi,
                "differential": round(this_diff, 1) if this_diff is not None else None,
                "used_in_hi": None,
                "hi_threshold": None,
                "differential_status": "unrated",
            }
        )
    return results


def player_handicap_trend(user: Optional[User], history: List[Round]) -> List[Dict[str, Any]]:
    trend = handicap_trend(history, **_seed(user))
    current = player_index_window(user, history)
    offset = max(0, len(history) - WHS_ROUNDS)
    counting = {offset + i for i in current["counting"]}
    threshold = current["threshold"]
    for i, entry in enumerate(trend):
        diff = entry["differential"]
        used = i in counting
        entry["hi_threshold"] = round(threshold, 1) if threshold is not None else None
        entry["used_in_hi"] = None if diff is None else used
        entry["differential_status"] = differential_status(diff, used, threshold if i >= offset else None)
    return trend


CLOSE_TO_COUNTING = 2.0


def differential_status(differential: Optional[float], used: bool, threshold: Optional[float]) -> str:
    if differential is None:
        return "unrated"
    if used:
        return "counting"
    if threshold is not None and differential - threshold <= CLOSE_TO_COUNTING:
        return "close"
    return "out"
