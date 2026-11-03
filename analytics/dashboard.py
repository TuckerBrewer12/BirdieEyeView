from typing import Any, Dict, List, Literal, Optional

from analytics import handicap as hcap
from analytics import stats as analytics
from analytics.insights import Rating, putts_rating
from models import Round
from models.hole_score import ScoreKind

RECENT_ROUNDS = 5
SCORE_KINDS: List[ScoreKind] = ["eagle", "birdie", "par", "bogey", "double", "triple", "quad"]

HandicapDirection = Literal["up", "down", "flat"]


def _pooled_pct(rows: List[Dict[str, Any]], successes: str, chances: str) -> Optional[float]:
    total = sum(r[chances] or 0 for r in rows)
    return sum(r[successes] or 0 for r in rows) / total * 100 if total > 0 else None


def scoring_average(rounds: List[Round], window: Optional[int] = None) -> Optional[float]:
    scores = [s for s in (r.calculate_total_score() for r in rounds) if s is not None]
    if window is not None:
        scores = scores[-window:]
    return sum(scores) / len(scores) if scores else None


def lowest_round(rounds: List[Round]) -> Optional[Round]:
    best: Optional[Round] = None
    best_score: Optional[int] = None
    for r in rounds:
        score = r.calculate_total_score()
        if score is not None and (best_score is None or score < best_score):
            best, best_score = r, score
    return best


def scoring_average_change(
    rounds: List[Round], window: int = RECENT_ROUNDS, full_window: bool = False
) -> Optional[float]:
    overall = scoring_average(rounds)
    recent = scoring_average(rounds, window)
    if overall is None or recent is None:
        return None
    if full_window and sum(1 for r in rounds if r.calculate_total_score() is not None) < window:
        return None
    return analytics.round_half_up(recent - overall, 1)


def recent_form(rounds: List[Round], window: int = RECENT_ROUNDS) -> Dict[str, Optional[float]]:
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
    putts = recent_putts_per_18 if recent_putts_per_18 is not None else average_putts
    rating: Optional[Rating] = putts_rating(putts) if putts is not None else None
    return {"per_round": putts, "rating": rating}


def score_mix(rounds: List[Round]) -> Dict[str, Any]:
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
    indexes = [r["handicap_index"] for r in handicap_trend if r["handicap_index"] is not None]
    delta = round(indexes[-1] - indexes[max(0, len(indexes) - 6)], 1) if len(indexes) >= 2 else None
    direction: Optional[HandicapDirection] = None
    if len(indexes) >= 3:
        fall = indexes[0] - indexes[-1]
        direction = "flat" if abs(fall) < 0.3 else ("down" if fall > 0 else "up")
    return {"delta": delta, "direction": direction}


def whs_breakdown(
    rounds: List[Round],
    handicap_trend: List[Dict[str, Any]],
    differentials: List[Dict[str, Any]],
    handicap_index: Optional[float],
) -> Dict[str, Any]:
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
    window_size = min(sum(1 for r in rows if r["differential"] is not None), 20)
    count_used, adjustment = hcap.whs_window(window_size)
    used = [r["differential"] for r in rows if r["used"] and r["differential"] is not None]
    return {
        "rows": rows,
        "window_size": window_size,
        "count_used": count_used,
        "adjustment": adjustment,
        "diff_avg": sum(used) / len(used) if used else None,
        "has_rated_rounds": any(d.get("course_rating") is not None for d in differentials),
        "show_calculation": handicap_index is not None and window_size >= 3,
    }


def _iso_date(raw: str) -> str:
    return str(raw).split("T")[0]


def _lowest_threshold(rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    reached = [r for r in rows if r.get("achievement")]
    return min(reached, key=lambda r: r["threshold"]) if reached else None


def lifetime_milestones(achievements: Dict[str, Any]) -> List[Dict[str, Any]]:
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
