"""Goal Engine — gap to a scoring goal and estimated strokes from each improvement area (savers).

The eighteen-hole goal is judged on complete eighteen-hole rounds and savers are per eighteen-hole
round; when a nine-hole goal is set, a separate nine-hole summary uses complete nine-hole rounds.
Nothing is doubled.

Savers are estimates under the stated assumptions below, not measured savings. They overlap (a
three-putt can also be a blowup hole), so their strokes are not independent shares to add up.
Ranking is by estimated strokes only; there is no effort or cost model.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from analytics import eligibility as el
from analytics.stats import (
    course_difficulty_profile_by_hole,
    overall_gir_percentage,
    overall_scrambling,
    score_type_distribution_per_round,
    scoring_by_par,
    scoring_by_yardage_buckets,
    three_putts_per_round,
)
from models.round import Round

# ---- Display policy
MIN_SAVER_STROKES = 0.1          # savers below this are not shown
MAX_GAP_PERCENT = 999.0          # cap on the percentage of the gap a saver closes

# ---- Evidence requirements
MIN_BUCKET_HOLES = 10            # yardage bucket needs this many holes
MIN_HOME_HOLE_OBSERVATIONS = 5   # home-course hole needs this many scores
MIN_PAR5_HOLES = 6               # par-5 estimate needs this many par 5s

# ---- Estimator assumptions (not calibrated against data; values kept from the original engine)
TARGET_DOUBLES_CONVERTED = 2.0   # per round, at most this many doubles become bogeys (1 stroke each)
TARGET_TRIPLES_CONVERTED = 1.0   # per round, at most this many triple-or-worse holes become bogeys
STROKES_PER_TRIPLE_PLUS = 2.0    # conservative: a triple-or-worse to bogey is at least 2 strokes
YARDAGE_MIN_STROKES = 0.3
AVERAGE_GIR_PERCENT = 45.0       # assumed amateur GIR benchmark
STROKES_PER_10_GIR_POINTS = 0.6  # assumed value of each 10 GIR percentage points closed
MAX_GIR_STEPS = 3.0              # at most 30 GIR points (3 steps of 10) are valued
MIN_GIR_STROKES = 0.15
SCRAMBLING_TARGET_PERCENT = 50.0
MAX_SCRAMBLING_GAIN = 0.15       # at most 15 percentage points of scrambling improvement
MIN_SCRAMBLING_STROKES = 0.15
PAR5_TARGET_TO_PAR = 0.3         # par 5s improve to +0.3 per hole at best
PAR5_MAX_GAIN_PER_HOLE = 0.8
PAR5_MIN_AVERAGE_TO_PAR = 0.4
MIN_PAR5_STROKES = 0.15


@dataclass
class _GoalContext:
    rounds: List[Round]                     # complete 18-hole rounds
    gap: Optional[float]                    # rounded gap; positive means strokes still to find
    home_course_rounds: Optional[List[Round]]

    def percent_of_gap(self, strokes: float) -> float:
        return min(strokes / self.gap * 100, MAX_GAP_PERCENT) if self.gap and self.gap > 0 else 0.0


def _saver(kind: str, strokes: float, ctx: _GoalContext, headline: str, detail: str, data: Dict[str, Any]):
    return {
        "type": kind,
        "strokes_saved": round(strokes, 2),
        "percentage_of_gap": round(ctx.percent_of_gap(strokes), 1),
        "headline": headline,
        "detail": detail,
        "data": data,
    }


def _three_putts(ctx: _GoalContext) -> Optional[dict]:
    # Only rounds with putts on every scored hole: partial putt coverage would undercount.
    covered = [r for r in ctx.rounds if r.get_total_putts() is not None]
    rows = three_putts_per_round(covered)
    if not rows:
        return None
    average = sum(row["three_putt_count"] for row in rows) / len(rows)
    if average < MIN_SAVER_STROKES:
        return None
    pct = ctx.percent_of_gap(average)
    detail = (
        f"You average {average:.1f} three-putts or worse per round. Turning each into a two-putt saves at "
        f"least a stroke, closing about {pct:.0f}% of your {ctx.gap:.1f}-stroke gap."
        if ctx.gap and ctx.gap > 0 else
        f"You average {average:.1f} three-putts or worse per round — keep eliminating them to push lower."
    )
    return _saver("three_putt_bleed", average, ctx, f"Eliminate 3+ putts → −{average:.1f} strokes/round", detail,
                  {"avg_three_putts": round(average, 2)})


def _blowup_holes(ctx: _GoalContext) -> Optional[dict]:
    rows = [r for r in score_type_distribution_per_round(ctx.rounds) if r["holes_counted"] > 0]
    if not rows:
        return None
    avg_doubles = sum(r["double_bogey"] / 100 * r["holes_counted"] for r in rows) / len(rows)
    avg_triples = sum((r["triple_bogey"] + r["quad_bogey"]) / 100 * r["holes_counted"] for r in rows) / len(rows)
    doubles = min(TARGET_DOUBLES_CONVERTED, avg_doubles)
    triples = min(TARGET_TRIPLES_CONVERTED, avg_triples)
    save = doubles * 1.0 + triples * STROKES_PER_TRIPLE_PLUS
    if save < MIN_SAVER_STROKES:
        return None
    return _saver(
        "blowup_holes", save, ctx,
        f"Tame blowup holes → −{save:.1f} strokes/round",
        f"You average {avg_doubles:.1f} doubles and {avg_triples:.1f} triple-or-worse holes per round. "
        f"Turning {doubles:.1f} doubles and {triples:.1f} triple-or-worse holes into bogeys saves about {save:.1f} strokes.",
        {"avg_doubles": round(avg_doubles, 2), "avg_triples_plus": round(avg_triples, 2), "realistic_save": round(save, 2)},
    )


def _achilles_heel(ctx: _GoalContext) -> Optional[dict]:
    buckets = [b for b in scoring_by_yardage_buckets(ctx.rounds) if b["sample_size"] >= MIN_BUCKET_HOLES]
    if not buckets:
        return None
    worst = max(buckets, key=lambda b: b["average_to_par"])
    # Per round over rounds that had yardage data, not every round.
    rounds_with_yardage = sum(1 for r in ctx.rounds if scoring_by_yardage_buckets([r]))
    per_round = worst["average_to_par"] * worst["sample_size"] / max(rounds_with_yardage, 1)
    if per_round < YARDAGE_MIN_STROKES:
        return None
    return _saver(
        "achilles_heel", per_round, ctx,
        f"Par {worst['par']}s {worst['bucket_label']} → +{worst['average_to_par']:.1f} avg",
        f"Your weakest distance zone is {worst['average_to_par']:+.1f} per hole, about {per_round:.1f} strokes "
        f"over par per round. Better par {worst['par']} approach play here would close part of that.",
        {"par": worst["par"], "bucket_label": worst["bucket_label"],
         "average_to_par": round(worst["average_to_par"], 2), "sample_size": worst["sample_size"]},
    )


def _home_course_demon(ctx: _GoalContext) -> Optional[dict]:
    if not ctx.home_course_rounds:
        return None
    profile = [h for h in course_difficulty_profile_by_hole(ctx.home_course_rounds)
               if h["sample_size"] >= MIN_HOME_HOLE_OBSERVATIONS]
    if not profile:
        return None
    hardest = max(profile, key=lambda h: h["average_to_par"])
    strokes = hardest["average_to_par"]
    if strokes < MIN_SAVER_STROKES:
        return None
    return _saver(
        "home_course_demon", strokes, ctx,
        f"Hole #{hardest['hole_number']} on your home course → +{strokes:.1f} avg",
        f"Hole #{hardest['hole_number']} is your toughest hole at home, averaging +{strokes:.1f} over "
        f"{hardest['sample_size']} rounds. Taming it adds up every time you play there.",
        {"hole_number": hardest["hole_number"], "average_to_par": round(strokes, 2), "sample_size": hardest["sample_size"]},
    )


def _gir_opportunity(ctx: _GoalContext, gir_pct: Optional[float]) -> Optional[dict]:
    if gir_pct is None or gir_pct >= AVERAGE_GIR_PERCENT:
        return None
    # Assumption: each 10 GIR percentage points closed is worth STROKES_PER_10_GIR_POINTS strokes.
    headroom = AVERAGE_GIR_PERCENT - gir_pct
    gain = min(headroom / 10, MAX_GIR_STEPS) * STROKES_PER_10_GIR_POINTS
    if gain < MIN_GIR_STROKES:
        return None
    return _saver(
        "gir_opportunity", gain, ctx,
        f"Hit more greens → GIR {gir_pct:.0f}% (avg is ~{AVERAGE_GIR_PERCENT:.0f}%)",
        f"You're hitting {gir_pct:.0f}% of greens in regulation — {headroom:.0f} percentage points below "
        f"the ~{AVERAGE_GIR_PERCENT:.0f}% assumed average. Closing up to 30 of those points is estimated at "
        f"{STROKES_PER_10_GIR_POINTS} strokes per 10 points.",
        {"gir_percentage": round(gir_pct, 1)},
    )


def _scrambling_opportunity(ctx: _GoalContext) -> Optional[dict]:
    rate = overall_scrambling(ctx.rounds)
    if rate["percentage"] is None or rate["percentage"] >= SCRAMBLING_TARGET_PERCENT:
        return None
    # Missed greens actually observed per round (no default GIR, no assumed 18 holes).
    rounds_with_misses = [r for r in ctx.rounds if overall_scrambling([r])["opportunities"]]
    misses_per_round = rate["opportunities"] / len(rounds_with_misses)
    gain_points = min((SCRAMBLING_TARGET_PERCENT - rate["percentage"]) / 100, MAX_SCRAMBLING_GAIN)
    saves = gain_points * misses_per_round
    if saves < MIN_SCRAMBLING_STROKES:
        return None
    target = rate["percentage"] + gain_points * 100
    return _saver(
        "scrambling_opportunity", saves, ctx,
        f"Improve scrambling → {rate['percentage']:.0f}% (target {SCRAMBLING_TARGET_PERCENT:.0f}%)",
        f"You save par or better {rate['percentage']:.0f}% of the time after missing a green, on about "
        f"{misses_per_round:.1f} missed greens per round. Reaching {target:.0f}% saves roughly {saves:.1f} strokes per round.",
        {"scrambling_percentage": round(rate["percentage"], 1)},
    )


def _par5_opportunity(ctx: _GoalContext) -> Optional[dict]:
    row = next((r for r in scoring_by_par(ctx.rounds) if r["par"] == 5), None)
    if not row or row["sample_size"] < MIN_PAR5_HOLES or row["average_to_par"] <= PAR5_MIN_AVERAGE_TO_PAR:
        return None
    rounds_with_par5 = sum(1 for r in ctx.rounds if any(p["par"] == 5 for p in scoring_by_par([r])))
    per_round = row["sample_size"] / max(rounds_with_par5, 1)
    # Assumption: par 5s improve to +PAR5_TARGET_TO_PAR per hole, at most PAR5_MAX_GAIN_PER_HOLE.
    save = min(row["average_to_par"] - PAR5_TARGET_TO_PAR, PAR5_MAX_GAIN_PER_HOLE) * per_round
    if save < MIN_PAR5_STROKES:
        return None
    return _saver(
        "par5_opportunity", save, ctx,
        f"Attack par 5s → averaging +{row['average_to_par']:.1f} on them",
        f"You're averaging +{row['average_to_par']:.1f} on par 5s — these should be your scoring holes. "
        f"Getting them to +{PAR5_TARGET_TO_PAR} each could save about {save:.1f} strokes/round.",
        {"average_to_par": round(row["average_to_par"], 2), "sample_size": row["sample_size"]},
    )


def _summary(rounds: List[Round], goal: Optional[int]) -> Dict[str, Any]:
    scores = [r.calculate_total_score() for r in rounds]
    if not scores or goal is None:
        return {"scoring_average": None, "best_score": None, "scoring_goal": goal, "gap": None, "on_track": False}
    average = sum(scores) / len(scores)
    gap = round(average - goal, 1)
    return {
        "scoring_average": round(average, 1),
        "best_score": min(scores),
        "scoring_goal": goal,
        "gap": gap,
        # Judged on the displayed (rounded) gap, so "0.0 to go" is on track.
        "on_track": gap <= 0,
    }


def goal_report(
    rounds: List[Round],
    scoring_goal: Optional[int],
    home_course_rounds: Optional[List[Round]] = None,
    *,
    scoring_goal_nine: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Goal report: 18-hole gap and ranked savers from complete 18-hole rounds, plus a ``nine_hole``
    summary from complete nine-hole rounds when a nine-hole goal is set.
    """
    eighteen = el.complete_rounds(rounds, el.EIGHTEEN)
    report = _summary(eighteen, scoring_goal)
    ctx = _GoalContext(rounds=eighteen, gap=report["gap"], home_course_rounds=home_course_rounds)

    savers: List[Dict[str, Any]] = []
    if report["gap"] is not None:
        gir_pct = overall_gir_percentage(eighteen)["gir_percentage"]
        candidates = [
            _three_putts(ctx), _blowup_holes(ctx), _achilles_heel(ctx), _home_course_demon(ctx),
            _gir_opportunity(ctx, gir_pct), _scrambling_opportunity(ctx), _par5_opportunity(ctx),
        ]
        savers = [s for s in candidates if s is not None and s["strokes_saved"] >= MIN_SAVER_STROKES]
        savers.sort(key=lambda s: s["strokes_saved"], reverse=True)
    report["savers"] = savers

    if scoring_goal_nine is not None:
        report["nine_hole"] = _summary(el.complete_rounds(rounds, el.NINE), scoring_goal_nine)
    return report
