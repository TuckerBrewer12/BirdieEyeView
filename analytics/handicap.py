"""World Handicap System (WHS) handicap index calculation."""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from models.hole import HOLES_PER_ROUND
from models.round import Round
from models.user import User

# WHS reduction table: number of differentials available → (count_to_use, adjustment)
# Requires at least 3 rounds with valid course rating + slope to produce a handicap.
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


def whs_window(rated_rounds: int) -> tuple[int, float]:
    """How many of the best differentials count, and the adjustment, for this many rated rounds."""
    n = min(rated_rounds, 20)
    if n < 3:
        return 0, 0.0
    return _WHS_TABLE[min(n - 3, len(_WHS_TABLE) - 1)]


def score_differential(score: int, course_rating: float, slope_rating: float) -> float:
    """WHS score differential = (Score - Course Rating) × 113 / Slope Rating."""
    return (score - course_rating) * 113.0 / slope_rating


def course_handicap(handicap_index: float, slope_rating: float, course_rating: float, par: int) -> int:
    """WHS course handicap = Index × Slope / 113 + (Course Rating − Par), to the nearest stroke.
    A half goes up, so a 12.5 plays off 13 and a plus 0.5 off scratch."""
    return math.floor(handicap_index * slope_rating / 113 + (course_rating - par) + 0.5)


def tee_course_handicap(
    handicap_index: Optional[float],
    slope_rating: Optional[float],
    course_rating: Optional[float],
    par: Optional[int],
) -> Optional[int]:
    """The strokes a golfer gets off a tee, once the index, the tee's ratings and the par are known."""
    if handicap_index is None or slope_rating is None or course_rating is None or par is None:
        return None
    return course_handicap(handicap_index, slope_rating, course_rating, par)


def round_course_handicap(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    """The golfer's course handicap for a round, off the tee played. Ratings are for 18 holes,
    so a nine or a round cut short has none, the way it has no differential."""
    tee = round_obj.get_tee()
    if tee is None or round_obj.holes_played() < HOLES_PER_ROUND:
        return None
    return tee_course_handicap(handicap_index, tee.slope_rating, tee.course_rating, round_obj.get_par())


def round_net_score(round_obj: Round, handicap_index: Optional[float]) -> Optional[int]:
    """Gross less the round's course handicap."""
    gross = round_obj.calculate_total_score()
    strokes = round_course_handicap(round_obj, handicap_index)
    if gross is None or strokes is None:
        return None
    return gross - strokes


def _get_differential_for_round(round_obj: Round) -> Optional[float]:
    """Return the score differential for a round, or None if data is unavailable.

    When slope/course_rating are available uses the WHS formula. When they are
    absent (unlinked rounds) falls back to score-to-par (equivalent to slope=113,
    rating=par), which keeps the handicap index moving correctly without rated data.
    """
    total = round_obj.calculate_total_score()
    if total is None:
        return None

    holes_played = round_obj.holes_played()

    tee = round_obj.get_tee()
    if tee is not None and tee.course_rating is not None and tee.slope_rating is not None:
        # Exclude 9-hole/partial rounds tracked against 18-hole course ratings
        if holes_played < HOLES_PER_ROUND and tee.course_rating >= 50.0:
            return None
        return score_differential(total, tee.course_rating, tee.slope_rating)

    # Fallback: no tee ratings available — use score-to-par as differential
    par = round_obj.get_par()
    if par is None:
        return None
    if holes_played < HOLES_PER_ROUND and par >= 50:
        return None
    return float(total - par)


def score_differentials_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    """Return per-round differentials (oldest-first list of rounds)."""
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


# The WHS window: an index reads the golfer's last 20 rounds.
WHS_ROUNDS = 20


def _eligible(
    rounds: List[Round],
    diffs: List[Optional[float]],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Tuple[int, float]]:
    """Each round that counts toward an index, as (its position in `rounds`, its differential),
    in round order.

    With a seed handicap (the one the golfer gave):
    - with seed_set_at: rounds before seed_set_at only count when they improve on the seed;
      rounds on/after seed_set_at all count.
    - without seed_set_at: onboarding, where the first `transition_rounds` rated rounds only
      count when they improve on the seed.
    """
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
    """The differentials an index over `rounds` reads, in round order."""
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
    """The index over `rounds` and how it was reached: the positions of the differentials that
    count, the highest of them (the cut-off), how many differentials the window has, and the
    WHS count and adjustment for that many."""
    eligible = _eligible(
        rounds, diffs, seed_handicap=seed_handicap, transition_rounds=transition_rounds, seed_set_at=seed_set_at,
    )[-use_last_n:]
    n = len(eligible)
    window: Dict[str, Any] = {
        "index": None, "counting": set(), "threshold": None, "rated": n, "count": 0, "adjustment": 0.0,
    }
    if n < 3:
        # With a handicap the golfer gave, hold it during onboarding, but let an exceptional
        # early round lower it even before there are three.
        if seed_handicap is not None:
            window["index"] = round(min([seed_handicap] + [d for _, d in eligible]), 1)
        return window

    count, adjustment = whs_window(n)
    # Lowest first; on a tie the more recent round counts, as WHS has it.
    ranked = sorted(eligible, key=lambda pair: (pair[1], -pair[0]))
    best = ranked[:count]
    # WHS caps index at 54.0
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
    """The index over `rounds` (oldest first) with the differentials that make it; see `_index_window`."""
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
    """
    Calculate the WHS Handicap Index over `rounds` (oldest first).

    Uses the last `use_last_n` differentials, with the WHS reduction table when there are
    fewer than 20. None under three, unless a seed handicap holds it.
    """
    return index_window(
        rounds,
        use_last_n,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )["index"]


def _seed(user: Optional[User]) -> Dict[str, Any]:
    """The handicap the golfer gave, and when: their index holds at it until their rounds say otherwise."""
    if user is None:
        return {"seed_handicap": None, "seed_set_at": None}
    return {"seed_handicap": user.handicap, "seed_set_at": user.last_handicap_update}


def player_index_window(user: Optional[User], rounds: Iterable[Round]) -> Dict[str, Any]:
    """The golfer's current index over their last 20 rounds (of `rounds`, oldest first), held at
    the handicap they gave until their rounds say otherwise, with the differentials that make it."""
    return index_window(list(rounds)[-WHS_ROUNDS:], **_seed(user))


def player_handicap_index(user: Optional[User], rounds: Iterable[Round]) -> Optional[float]:
    """The golfer's current index: the one every screen shows, and that course handicaps and
    net scores start from. `rounds` are theirs, oldest first, ending with the latest."""
    return player_index_window(user, rounds)["index"]


def handicap_trend(
    rounds: Iterable[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    The index after each round (oldest first): the index over the 20 rounds ending with it,
    the window the current index reads, so the last point is the current index.
    """
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
    """The golfer's index after each round of `history` (theirs, oldest first, ending with the
    latest), off the handicap they gave, so the last point is the index every screen shows. Each
    round is marked by where its differential stands against that index: one of the differentials
    it counts, close to the cut-off, out, or unrated."""
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
        # A round older than the last 20 is out of the window, however low its differential.
        entry["differential_status"] = differential_status(diff, used, threshold if i >= offset else None)
    return trend


# How far over the counting cut-off a differential can be and still read as close.
CLOSE_TO_COUNTING = 2.0


def differential_status(differential: Optional[float], used: bool, threshold: Optional[float]) -> str:
    """Where a round's differential stands in the WHS window: "counting" (one of the best N),
    "close" (within CLOSE_TO_COUNTING of the cut-off), "out", or "unrated" without a differential."""
    if differential is None:
        return "unrated"
    if used:
        return "counting"
    if threshold is not None and differential - threshold <= CLOSE_TO_COUNTING:
        return "close"
    return "out"
