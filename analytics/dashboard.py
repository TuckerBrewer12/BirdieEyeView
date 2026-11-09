"""The dashboard's figures, worked out from the player's recent rounds.

Every function takes the rounds (oldest first) or the trend rows analytics already builds from
them, so the dashboard and the analytics page read the same numbers.
"""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from analytics import stats as analytics
from analytics.insights import Rating, putts_rating
from models import Round
from models.hole_score import ScoreKind

RECENT_ROUNDS = 5
SCORE_KINDS: List[ScoreKind] = ["eagle", "birdie", "par", "bogey", "double", "triple", "quad"]

HandicapDirection = Literal["up", "down", "flat"]
# Whether a figure's move is for the better (a score or a handicap falling is good): shown green, red or muted.
ChangeVerdict = Literal["good", "bad", "neutral"]


def _pooled_pct(rows: List[Dict[str, Any]], successes: str, chances: str) -> Optional[float]:
    """A rate pooled over every chance in the rows, not averaged per round."""
    total = sum(r[chances] or 0 for r in rows)
    return sum(r[successes] or 0 for r in rows) / total * 100 if total > 0 else None


def scoring_average(rounds: List[Round], window: Optional[int] = None) -> Optional[float]:
    """Average score over the last `window` scored rounds, or all of them."""
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    if window is not None:
        scores = scores[-window:]
    return sum(scores) / len(scores) if scores else None


def scoring_average_change(
    rounds: List[Round], window: int = RECENT_ROUNDS, full_window: bool = False
) -> Optional[float]:
    """How far the last `window` rounds' average sits from the whole window's, to a tenth.
    Negative means the recent rounds came in lower. With `full_window`, null until `window`
    rounds have a score."""
    overall = scoring_average(rounds)
    recent = scoring_average(rounds, window)
    if overall is None or recent is None:
        return None
    if full_window and sum(1 for r in rounds if r.calculate_total_score() is not None) < window:
        return None
    return analytics.round_half_up(recent - overall, 1)


def change_verdict(change: Optional[float]) -> Optional[ChangeVerdict]:
    """Whether a move in a figure that improves as it falls (a score, a handicap) is for the better."""
    if change is None:
        return None
    return "neutral" if change == 0 else ("good" if change < 0 else "bad")


def recent_form(rounds: List[Round], window: int = RECENT_ROUNDS) -> Dict[str, Optional[float]]:
    """GIR, scrambling and up-and-down rates, and putts per 18, over the last `window` rounds."""
    recent = rounds[-window:]
    gir_rows = [r for r in analytics.gir_per_round(recent) if r["total_gir"] is not None and r["holes_played"]]
    putt_rows = [r for r in analytics.putts_per_round(recent) if r["total_putts"] is not None and r["holes_played"]]
    putt_holes = sum(r["holes_played"] for r in putt_rows)
    return {
        "gir_pct": _pooled_pct(gir_rows, "total_gir", "holes_played"),
        "scrambling_pct": _pooled_pct(analytics.scrambling_per_round(recent), "scramble_successes", "scramble_opportunities"),
        "up_and_down_pct": _pooled_pct(analytics.up_and_down_trend(recent), "successes", "opportunities"),
        "putts_per_18": sum(r["total_putts"] for r in putt_rows) / putt_holes * 18 if putt_holes else None,
    }


def putts_shown(recent_putts_per_18: Optional[float], average_putts: Optional[float]) -> Dict[str, Any]:
    """The putts figure the dashboard shows, and how good it is.

    The last five rounds' putts per 18 when they have putts, else the average over every round.
    Rated by `insights.putts_rating`, so the dashboard and the analytics page agree.
    """
    putts = recent_putts_per_18 if recent_putts_per_18 is not None else average_putts
    rating: Optional[Rating] = putts_rating(putts) if putts is not None else None
    return {"per_round": putts, "rating": rating}


def score_mix(rounds: List[Round]) -> Dict[str, Any]:
    """Percent of classified holes in each score bucket, and how many holes that is."""
    counts = {kind: 0 for kind in SCORE_KINDS}
    for round_ in rounds:
        for kind, count in round_.get_score_counts().items():
            counts[kind] += count
    holes = sum(counts.values())
    return {
        "percentages": {kind: (counts[kind] / holes * 100 if holes else 0.0) for kind in SCORE_KINDS},
        "holes": holes,
    }


def handicap_change(handicap_trend: List[Dict[str, Any]]) -> Dict[str, Any]:
    """How the index moved: the change over the last six rated rounds, and the direction over the window."""
    indexes = [r["handicap_index"] for r in handicap_trend if r["handicap_index"] is not None]
    delta = round(indexes[-1] - indexes[max(0, len(indexes) - 6)], 1) if len(indexes) >= 2 else None
    direction: Optional[HandicapDirection] = None
    if len(indexes) >= 3:
        fall = indexes[0] - indexes[-1]
        direction = "flat" if abs(fall) < 0.3 else ("down" if fall > 0 else "up")
    return {
        "delta": delta,
        "direction": direction,
        "delta_verdict": change_verdict(delta),
    }


def _round_day(round_: Round) -> Optional[date]:
    return round_.date.date() if round_.date is not None else None


def handicap_change_this_month(
    rounds: List[Round], handicap_trend: List[Dict[str, Any]], today: date
) -> Optional[float]:
    """How far the index has moved since this month began: the newest index less the index after
    the last round played before the 1st, to a tenth. `rounds` and `handicap_trend` line up, oldest
    first. Null without an index from before this month, or without one now."""
    month_start = today.replace(day=1)
    before: Optional[float] = None
    for round_, row in zip(rounds, handicap_trend):
        day = _round_day(round_)
        if day is not None and day < month_start and row["handicap_index"] is not None:
            before = row["handicap_index"]
    indexes = [r["handicap_index"] for r in handicap_trend if r["handicap_index"] is not None]
    if before is None or not indexes:
        return None
    return round(indexes[-1] - before, 1)


def today() -> date:
    """The day the dashboard reads "this month" and "this season" against. A seam, so a generated
    fixture can pin it."""
    return datetime.now(timezone.utc).date()


def rounds_this_year(rounds: List[Round], today: date) -> int:
    """Rounds played this calendar year: the dashboard's "rounds this season"."""
    return sum(1 for d in (_round_day(r) for r in rounds) if d is not None and d.year == today.year)


def round_flow(round_: Optional[Round]) -> List[Dict[str, int]]:
    """A round's to par after each hole (`Round.running_to_par`), hole by hole: the last round's line."""
    if round_ is None:
        return []
    return [{"hole_number": hole, "to_par": to_par} for hole, to_par in sorted(round_.running_to_par().items())]


def whs_breakdown(
    rounds: List[Round],
    handicap_trend: List[Dict[str, Any]],
    differentials: List[Dict[str, Any]],
    index_window: Dict[str, Any],
) -> Dict[str, Any]:
    """The rounds in the WHS window, newest first, which ones count, and their average differential.
    `index_window` is the golfer's index and how it was reached (`handicap.player_index_window`),
    so the breakdown adds up to the index shown."""
    by_index = {d["round_index"]: d for d in differentials}
    score_rows = analytics.score_trend(rounds)
    rows = []
    for i, score_row in enumerate(score_rows):
        trend = handicap_trend[i] if i < len(handicap_trend) else {}
        diff = by_index.get(score_row["round_index"], {})
        rows.append({
            "round_index": score_row["round_index"],
            "course_name": score_row.get("course_name"),
            "course_rating": diff.get("course_rating"),
            "slope_rating": diff.get("slope_rating"),
            "score": diff.get("score") if diff.get("score") is not None else score_row.get("total_score"),
            "differential": trend.get("differential"),
            "used": trend.get("used_in_hi") is True,
        })
    rows.reverse()
    used = [r["differential"] for r in rows if r["used"] and r["differential"] is not None]
    return {
        "rows": rows,
        "window_size": index_window["rated"],
        "count_used": index_window["count"],
        "adjustment": index_window["adjustment"],
        "diff_avg": sum(used) / len(used) if used else None,
        "has_rated_rounds": any(d.get("course_rating") is not None for d in differentials),
        "show_calculation": index_window["index"] is not None and index_window["rated"] >= 3,
    }


def _iso_date(raw: str) -> str:
    return str(raw).split("T")[0]


def _lowest_threshold(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    reached = [r for r in rows if r.get("achievement")]
    return min(reached, key=lambda r: r["threshold"]) if reached else None


def lifetime_milestones(achievements: Dict[str, Any]) -> List[Dict[str, Any]]:
    """The best score, fewest putts and longest par streak, newest first.

    The first round under par stands in for the best score break once there is one.
    """
    rounds = achievements.get("round_milestones", {}).get("lifetime", {})
    putting = achievements.get("putting_milestones", {}).get("lifetime", {})
    streak = achievements.get("best_performance_streaks_events", {}).get("lifetime", {}).get("longest_par_streak")

    def fact(kind: str, value: int, event: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "kind": kind,
            "value": value,
            "date": _iso_date(event["date"]),
            "course": event["course"],
            "round_id": event.get("round_id"),
        }

    milestones = []
    under_par = rounds.get("first_round_under_par")
    best_break = _lowest_threshold(rounds.get("score_breaks", []))
    if under_par:
        milestones.append(fact("under_par", under_par["score"], under_par))
    elif best_break:
        milestones.append(fact("score_break", best_break["threshold"], best_break["achievement"]))
    putt_break = _lowest_threshold(putting.get("putt_breaks", []))
    if putt_break:
        milestones.append(fact("putt_break", putt_break["threshold"], putt_break["achievement"]))
    if streak:
        length = achievements.get("best_performance_streaks", {}).get("lifetime", {}).get("longest_par_streak")
        milestones.append(fact("par_streak", length, streak))
    return sorted(milestones, key=lambda m: m["date"], reverse=True)
