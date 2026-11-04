"""World Handicap System (WHS) handicap index calculation."""

from __future__ import annotations

from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, Iterable, List, Optional, Tuple

from models.round import Round

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


def course_handicap(handicap_index_value: Optional[float], round_obj: Round) -> Optional[int]:
    """WHS Course Handicap for the round's holes, rounded .5 up; None without index, rating or par.

    A nine-hole round uses half the Handicap Index with its nine-hole rating and par.
    """
    rating = round_rating(round_obj)
    par = round_obj.get_par()
    coverage = round_obj.get_intended_holes()
    if handicap_index_value is None or rating is None or par is None or coverage is None:
        return None
    course_rating, slope = rating
    index = handicap_index_value / 2 if len(coverage) == 9 else handicap_index_value
    return int(round_half_up(index * slope / 113 + (course_rating - par)))


def score_differential(score: int, course_rating: float, slope_rating: float) -> float:
    """WHS score differential = (Score - Course Rating) × 113 / Slope Rating."""
    return (score - course_rating) * 113.0 / slope_rating


def _get_differential_for_round(round_obj: Round) -> Optional[float]:
    """Return the score differential for a round, or None if data is unavailable.

    When slope/course_rating are available uses the WHS formula. When they are
    absent (unlinked rounds) falls back to score-to-par (equivalent to slope=113,
    rating=par), which keeps the handicap index moving correctly without rated data.
    """
    total = round_obj.calculate_total_score()
    if total is None:
        return None

    holes_played = sum(1 for s in round_obj.hole_scores if s.strokes is not None)

    tee = round_obj.get_tee()
    if tee is not None and tee.course_rating is not None and tee.slope_rating is not None:
        # Exclude 9-hole/partial rounds tracked against 18-hole course ratings
        if holes_played < 18 and tee.course_rating >= 50.0:
            return None
        return score_differential(total, tee.course_rating, tee.slope_rating)

    # Fallback: no tee ratings available — use score-to-par as differential
    par = round_obj.get_par()
    if par is None:
        return None
    if holes_played < 18 and par >= 50:
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


def _eligible_differentials(
    rounds: List[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[float]:
    """
    Build the differential list used for HI calculations.

    If seed_handicap is provided:
    - with seed_set_at: rounds before seed_set_at only contribute when they
      improve on the seed; rounds on/after seed_set_at all contribute.
    - without seed_set_at: onboarding behavior where first `transition_rounds`
      valid rounds only contribute when they improve on the seed.
    """
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
    """
    Calculate the current WHS Handicap Index.

    Uses the last `use_last_n` rounds with valid differentials. Applies the
    WHS reduction table when fewer than 20 valid rounds are available. Returns
    None if fewer than 3 valid rounds exist.
    """
    all_rounds = list(rounds)
    eligible = _eligible_differentials(
        all_rounds,
        seed_handicap=seed_handicap,
        transition_rounds=transition_rounds,
        seed_set_at=seed_set_at,
    )
    # Take only last N eligible differentials
    recent = eligible[-use_last_n:]
    valid = sorted(recent)

    n = len(valid)
    if n < 3:
        # With a user-provided seed handicap, hold the seed during onboarding,
        # but allow exceptional early rounds to lower it even before 3 rounds.
        if seed_handicap is not None:
            if n == 0:
                return round(seed_handicap, 1)
            return round(min(seed_handicap, min(valid)), 1)
        return None

    # WHS table is indexed by (n - 3) capped at 17 (for 20+)
    table_idx = min(n - 3, len(_WHS_TABLE) - 1)
    count, adjustment = _WHS_TABLE[table_idx]

    best = valid[:count]
    hi = (sum(best) / len(best)) + adjustment

    # WHS caps index at 54.0
    hi = min(hi, 54.0)
    return round(hi, 1)


def handicap_trend(
    rounds: Iterable[Round],
    *,
    seed_handicap: Optional[float] = None,
    transition_rounds: int = 10,
    seed_set_at: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Rolling handicap index after each round (oldest-first).

    Each entry shows what the handicap index would have been after that round
    was played. Returns None for rounds where not enough history exists.
    """
    all_rounds = list(rounds)
    results: List[Dict[str, Any]] = []

    # Compute differentials and rolling HI for each round
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
            }
        )

    return results


def annotate_used_in_hi(entries: List[Dict[str, Any]]) -> None:
    """
    Annotate a list of trend entries (in-place) with used_in_hi and hi_threshold.
    Marks exactly the WHS best-N rounds as used. Ties at the threshold boundary are
    broken by recency (most recent round wins), matching WHS practice.
    Call this AFTER slicing to the display window.
    """
    # Collect (entry_index, differential) for valid rounds, last 20 only
    valid: List[tuple[int, float]] = [
        (i, e["differential"]) for i, e in enumerate(entries) if e["differential"] is not None
    ]
    recent = valid[-20:]
    n = len(recent)

    threshold: Optional[float] = None
    used_indices: set[int] = set()

    if n >= 3:
        count, _ = _WHS_TABLE[min(n - 3, len(_WHS_TABLE) - 1)]
        # Sort by differential asc; break ties by entry index desc (most recent first)
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
