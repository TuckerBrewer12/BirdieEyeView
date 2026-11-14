"""WHS-based Handicap Index estimate.

Follows the World Handicap System where this app's data supports it: score differentials from
complete eighteen-hole rounds with the Course and Slope Rating covering the holes played, rounded
to the nearest tenth with .5 up; the fewer-than-20 table and best 8 of the latest 20. It is an
estimate, not an official index: there is no adjusted gross score, playing conditions calculation
or caps, rounds without a rating fall back to score minus par, a manual seed/reset is honored, and
nine-hole rounds are not used yet (the WHS nine-hole method needs an expected score).

Every caller passes the same inputs (``seed_handicap``/``seed_set_at`` from the user and the full
round history) so every screen shows the same index.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple

from analytics import eligibility as el
from models.user import User
from models.round import Round

CLOSE_TO_COUNTING = 2.0
WHS_ROUNDS = 20
MAX_HANDICAP_INDEX = 54.0
WHS_WINDOW = 20

# WHS reduction table: number of differentials available → (count_to_use, adjustment)
# Requires at least 3 rounds with valid differentials to produce a handicap.
_WHS_TABLE: List[tuple[int, float]] = [
    (1, -2.0),   # 3 rounds
    (1, -1.0),   # 4
    (1, 0.0),    # 5
    (2, -1.0),   # 6
    (2, 0.0),    # 7
    (2, 0.0),    # 8
    (3, 0.0),    # 9
    (3, 0.0),    # 10
    (3, 0.0),    # 11
    (4, 0.0),    # 12
    (4, 0.0),    # 13
    (4, 0.0),    # 14
    (5, 0.0),    # 15
    (5, 0.0),    # 16
    (6, 0.0),    # 17
    (6, 0.0),    # 18
    (7, 0.0),    # 19
    (8, 0.0),    # 20+
]


def round_half_up(value: float, places: int = 0) -> float:
    """Round to ``places`` decimals with .5 going up (WHS), not Python's round-half-to-even."""
    step = Decimal(1).scaleb(-places)
    return float(Decimal(str(value)).quantize(step, rounding=ROUND_HALF_UP))


def round_rating(round_obj: Round) -> Optional[Tuple[float, float]]:
    """(Course Rating, Slope Rating) covering exactly the holes the round was meant to play.

    A rating saved without hole coverage covers the linked course's whole layout (18 holes on an
    18-hole course, 9 on a nine-hole course); it is never stretched to a different set of holes,
    so a front or back nine of an 18-hole course has no rating unless one was recorded for it.
    """
    tee = round_obj.get_tee()
    coverage = round_obj.get_intended_holes()
    if tee is None or coverage is None:
        return None
    rating = tee.get_rating(coverage)
    if rating is not None:
        values = (rating.course_rating, rating.slope_rating)
    elif tee.rating_holes is None and not tee.ratings:
        layout = round_obj.course.get_expected_holes() if round_obj.course is not None else None
        values = (tee.course_rating, tee.slope_rating) if layout == coverage else (None, None)
    else:
        values = (None, None)
    return values if None not in values else None


def course_handicap(handicap_index: float, slope_rating: float, course_rating: float, par: int) -> int:
    return int(round_half_up(handicap_index * slope_rating / 113 + (course_rating - par), 0))


def score_differential(score: int, course_rating: float, slope_rating: float) -> float:
    """WHS score differential = (Score - Course Rating) × 113 / Slope Rating, unrounded."""
    if not slope_rating:
        raise ValueError("Slope Rating must be positive")
    return (score - course_rating) * 113.0 / slope_rating


def _get_differential_for_round(round_obj: Round) -> Optional[float]:
    """The round's differential to the tenth (.5 up), or None when the round can't count.

    Only complete eighteen-hole rounds count. With a rating covering the holes played the WHS
    formula applies; without one the estimate falls back to score minus par.
    """
    if el.round_format(round_obj) != el.EIGHTEEN or not round_obj.is_complete():
        return None
    total = round_obj.calculate_total_score()
    rating = round_rating(round_obj)
    if rating is not None:
        return round_half_up(score_differential(total, *rating), 1)
    par = round_obj.get_par()
    return float(total - par) if par is not None else None


@dataclass(frozen=True)
class _Differential:
    round_obj: Round
    value: float


def _differentials(rounds: List[Round]) -> List[_Differential]:
    found = []
    for round_obj in rounds:
        value = _get_differential_for_round(round_obj)
        if value is not None:
            found.append(_Differential(round_obj, value))
    return found


def _eligible(
    differentials: List[_Differential],
    *,
    seed_handicap: Optional[float],
    transition_rounds: int,
    seed_set_at: Optional[datetime],
) -> List[_Differential]:
    """Differentials that count, in date order.

    With a seed and ``seed_set_at``, rounds before that calendar day count only when they beat the
    seed; undated rounds count as after it. With a seed but no date, the first ``transition_rounds``
    differentials count only when they beat the seed.
    """
    if seed_handicap is None:
        return differentials
    if seed_set_at is not None:
        cutoff: date = seed_set_at.date()
        before, after = [], []
        for d in differentials:
            played = d.round_obj.date.date() if d.round_obj.date is not None else None
            (before if played is not None and played < cutoff else after).append(d)
        return [d for d in before if d.value < seed_handicap] + after
    early, late = differentials[:transition_rounds], differentials[transition_rounds:]
    return [d for d in early if d.value < seed_handicap] + late


def _select(eligible: List[_Differential], use_last_n: int) -> Tuple[List[_Differential], float]:
    """The differentials the index uses and the table adjustment (needs at least 3)."""
    recent = eligible[-use_last_n:]
    count, adjustment = _WHS_TABLE[min(len(recent) - 3, len(_WHS_TABLE) - 1)]
    # Lowest first; on equal values the most recent round is used (WHS practice).
    ordered = sorted(enumerate(recent), key=lambda item: (item[1].value, -item[0]))
    return [d for _, d in ordered[:count]], adjustment


def _index_from(
    differentials: List[_Differential],
    *,
    use_last_n: int,
    seed_handicap: Optional[float],
    transition_rounds: int,
    seed_set_at: Optional[datetime],
) -> Tuple[Optional[float], List[_Differential]]:
    eligible = _eligible(
        differentials, seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at,
    )
    recent = eligible[-use_last_n:]
    if len(recent) < 3:
        # With a seed, hold it during onboarding but let exceptional early rounds lower it.
        if seed_handicap is None:
            return None, []
        best = min([seed_handicap] + [d.value for d in recent])
        return round_half_up(min(best, MAX_HANDICAP_INDEX), 1), []
    used, adjustment = _select(eligible, use_last_n)
    index = sum(d.value for d in used) / len(used) + adjustment
    return round_half_up(min(index, MAX_HANDICAP_INDEX), 1), used


def _check_window(use_last_n: int) -> None:
    if not 1 <= use_last_n <= WHS_WINDOW:
        raise ValueError(f"use_last_n must be between 1 and {WHS_WINDOW}")


def score_differentials_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Per-round differentials in the given order (the same values the index uses)."""
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        rating = round_rating(round_obj)
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "score": round_obj.calculate_total_score() if round_obj.is_complete() else None,
                "course_rating": rating[0] if rating else None,
                "slope_rating": rating[1] if rating else None,
                "differential": _get_differential_for_round(round_obj),
            }
        )
    return results


def handicap_index(
    rounds: Iterable[Round],
    use_last_n: int = WHS_WINDOW,
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> Optional[float]:
    """
    Current WHS-based Handicap Index estimate from the rounds given (sorted by date here).

    Uses the latest ``use_last_n`` (1-20) eligible differentials with the fewer-than-20 table.
    Returns None with fewer than 3 eligible rounds and no seed.
    """
    _check_window(use_last_n)
    index, _ = _index_from(
        _differentials(el.chronological(rounds)),
        use_last_n=use_last_n,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )
    return index


def user_handicap_index(rounds: Iterable[Round], user: Any) -> Optional[float]:
    """The index every screen shows: full history plus the user's seed and reset date."""
    return handicap_index(
        rounds,
        seed_handicap=getattr(user, "handicap", None),
        seed_set_at=getattr(user, "last_handicap_update", None),
    )


def handicap_trend(
    rounds: Iterable[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Index after each round (date order), with ``used_in_hi`` marking the rounds the current
    index (after the last round) actually uses and ``hi_threshold`` the highest of them.
    """
    ordered = el.chronological(rounds)
    differentials = _differentials(ordered)
    by_round = {id(d.round_obj): d for d in differentials}
    options = {"use_last_n": WHS_WINDOW, "seed_handicap": seed_handicap,
               "transition_rounds": transition_rounds, "seed_set_at": seed_set_at}

    results: List[Dict[str, Any]] = []
    seen: List[_Differential] = []
    for i, round_obj in enumerate(ordered, start=1):
        this = by_round.get(id(round_obj))
        if this is not None:
            seen.append(this)
        index, _ = _index_from(list(seen), **options)
        results.append(
            {
                "round_index": i,
                "round_id": round_obj.id,
                "handicap_index": index,
                "differential": this.value if this is not None else None,
                "used_in_hi": None,
                "hi_threshold": None,
            }
        )

    _, used = _index_from(differentials, **options)
    used_ids = {id(d.round_obj) for d in used}
    threshold = max((d.value for d in used), default=None)
    for entry, round_obj in zip(results, ordered):
        entry["hi_threshold"] = threshold
        if entry["differential"] is not None:
            entry["used_in_hi"] = id(round_obj) in used_ids
    eligible = _eligible(differentials, seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at)[-WHS_WINDOW:]
    eligible_ids = {id(d.round_obj) for d in eligible}
    for entry, round_obj in zip(results, ordered):
        entry["differential_status"] = differential_status(entry["differential"], bool(entry["used_in_hi"]), entry["hi_threshold"] if id(round_obj) in eligible_ids else None)
    return results


def differential_status(differential: Optional[float], used: bool, threshold: Optional[float]) -> str:
    if differential is None:
        return "unrated"
    if used:
        return "counting"
    if threshold is not None and differential - threshold <= CLOSE_TO_COUNTING:
        return "close"
    return "out"


def player_handicap_trend(user: Optional[User], history: List[Round]) -> List[Dict[str, Any]]:
    return handicap_trend(history, **_seed(user))


def player_handicap_index(user: Optional[User], rounds: Iterable[Round]) -> Optional[float]:
    return player_index_window(user, rounds)["index"]


def player_index_window(user: Optional[User], rounds: Iterable[Round]) -> Dict[str, Any]:
    return index_window(rounds, **_seed(user))


def _seed(user: Optional[User]) -> Dict[str, Any]:
    if user is None:
        return {"seed_handicap": None, "seed_set_at": None}
    return {"seed_handicap": user.handicap, "seed_set_at": user.last_handicap_update}


def index_window(rounds: Iterable[Round], use_last_n: int = WHS_WINDOW, *,
                 seed_handicap: Optional[float] = None, transition_rounds: int = 10,
                 seed_set_at: Optional[datetime] = None) -> Dict[str, Any]:
    _check_window(use_last_n)
    ordered = el.chronological(rounds)
    differentials = _differentials(ordered)
    options = dict(seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at)
    eligible = _eligible(differentials, **options)[-use_last_n:]
    index, used = _index_from(differentials, use_last_n=use_last_n, **options)
    used_ids = {id(d.round_obj) for d in used}
    eligible_ids = {id(d.round_obj) for d in eligible}
    count, adjustment = whs_window(len(eligible))
    return dict(index=index, counting={i for i,r in enumerate(ordered) if id(r) in used_ids},
                eligible={i for i,r in enumerate(ordered) if id(r) in eligible_ids},
                threshold=max((d.value for d in used), default=None), rated=len(eligible),
                count=count, adjustment=adjustment)






def round_net_score(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    gross = round_obj.calculate_total_score()
    strokes = round_course_handicap(round_obj, handicap_index)
    if gross is None or strokes is None:
        return None
    return gross - strokes


def round_course_handicap(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    rating = round_rating(round_obj)
    par = round_obj.get_par()
    coverage = round_obj.get_intended_holes()
    if handicap_index is None or rating is None or par is None or coverage is None or not round_obj.is_complete():
        return None
    course_rating, slope = rating
    index = handicap_index / 2 if len(coverage) == 9 else handicap_index
    return course_handicap(index, slope, course_rating, par)


def tee_course_handicap(
    handicap_index: Optional[float],
    slope_rating: Optional[float],
    course_rating: Optional[float],
    par: Optional[int],
) -> Optional[int]:
    if handicap_index is None or slope_rating is None or course_rating is None or par is None:
        return None
    return course_handicap(handicap_index, slope_rating, course_rating, par)


def whs_window(rated_rounds: int) -> tuple[int, float]:
    n = min(rated_rounds, 20)
    if n < 3:
        return 0, 0.0
    return _WHS_TABLE[min(n - 3, len(_WHS_TABLE) - 1)]
