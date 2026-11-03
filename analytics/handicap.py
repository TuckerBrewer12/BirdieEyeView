from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional

from models.round import Round

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


def _get_differential_for_round(round_obj: Round) -> Optional[float]:
    total = round_obj.calculate_total_score()
    if total is None:
        return None

    holes_played = sum(1 for s in round_obj.hole_scores if s.strokes is not None)

    tee = round_obj.get_tee()
    if tee is not None and tee.course_rating is not None and tee.slope_rating is not None:
        if holes_played < 18 and tee.course_rating >= 50.0:
            return None
        return score_differential(total, tee.course_rating, tee.slope_rating)

    par = round_obj.get_par()
    if par is None:
        return None
    if holes_played < 18 and par >= 50:
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


def _eligible_differentials(
    rounds: List[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[float]:
    if seed_handicap is None:
        diffs = [_get_differential_for_round(r) for r in rounds]
        return [d for d in diffs if d is not None]

    if seed_set_at is not None:
        cutoff: date = seed_set_at.date()
        before: List[float] = []
        after: List[float] = []
        for r in rounds:
            d = _get_differential_for_round(r)
            if d is None:
                continue
            round_day = r.date.date() if isinstance(r.date, datetime) else r.date
            if round_day is not None and round_day < cutoff:
                before.append(d)
            else:
                after.append(d)
        return [d for d in before if d < seed_handicap] + after

    diffs = [_get_differential_for_round(r) for r in rounds]
    valid = [d for d in diffs if d is not None]
    early = valid[:transition_rounds]
    late = valid[transition_rounds:]
    early_improving = [d for d in early if d < seed_handicap]
    return early_improving + late


def handicap_index(
    rounds: Iterable[Round],
    use_last_n: int = 20,
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> Optional[float]:
    all_rounds = list(rounds)
    eligible = _eligible_differentials(
        all_rounds,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )
    recent = eligible[-use_last_n:]
    valid = sorted(recent)

    n = len(valid)
    if n < 3:
        if seed_handicap is not None:
            if n == 0:
                return round(seed_handicap, 1)
            return round(min(seed_handicap, min(valid)), 1)
        return None

    table_idx = min(n - 3, len(_WHS_TABLE) - 1)
    count, adjustment = _WHS_TABLE[table_idx]

    best = valid[:count]
    hi = (sum(best) / len(best)) + adjustment

    hi = min(hi, 54.0)
    return round(hi, 1)


def handicap_trend(
    rounds: Iterable[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    all_rounds = list(rounds)
    results: List[Dict[str, Any]] = []

    for i, round_obj in enumerate(all_rounds, start=1):
        hi = handicap_index(
            all_rounds[:i],
            seed_handicap=seed_handicap,
            transition_rounds=transition_rounds,
            seed_set_at=seed_set_at,
        )
        this_diff = _get_differential_for_round(round_obj)
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


def windowed_handicap_trend(hi_rounds: List[Round], display_count: int) -> List[Dict[str, Any]]:
    full = handicap_trend(hi_rounds)
    sliced = full[-display_count:] if display_count else []
    annotate_used_in_hi(sliced)
    return sliced


CLOSE_TO_COUNTING = 2.0


def differential_status(differential: Optional[float], used: bool, threshold: Optional[float]) -> str:
    if differential is None:
        return "unrated"
    if used:
        return "counting"
    if threshold is not None and differential - threshold <= CLOSE_TO_COUNTING:
        return "close"
    return "out"


def annotate_used_in_hi(entries: List[Dict[str, Any]]) -> None:
    valid: List[tuple[int, float]] = [
        (i, e["differential"]) for i, e in enumerate(entries) if e["differential"] is not None
    ]
    recent = valid[-20:]
    n = len(recent)

    threshold: Optional[float] = None
    used_indices: set[int] = set()

    if n >= 3:
        count, _ = _WHS_TABLE[min(n - 3, len(_WHS_TABLE) - 1)]
        sorted_recent = sorted(recent, key=lambda x: (x[1], -x[0]))
        used = sorted_recent[:count]
        used_indices = {idx for idx, _ in used}
        threshold = sorted_recent[count - 1][1]

    for i, entry in enumerate(entries):
        diff = entry["differential"]
        entry["hi_threshold"] = round(threshold, 1) if threshold is not None else None
        if diff is None:
            entry["used_in_hi"] = None
        else:
            entry["used_in_hi"] = i in used_indices
        entry["differential_status"] = differential_status(diff, i in used_indices, threshold)
