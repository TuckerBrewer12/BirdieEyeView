"""Goal Engine — computes strokes-to-find and ranks highest-ROI improvement areas."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from models.round import Round
from analytics.peak import peak_gap, peak_meets_goal
from analytics.stats import (
    full_rounds,
    three_putts_per_round,
    score_type_distribution_per_round,
    scoring_by_yardage_buckets,
    course_difficulty_profile_by_hole,
    overall_gir_percentage,
    scrambling_per_round,
    scoring_by_par,
)


def _progress_pct(start: int, average: float, goal: int, on_track: bool) -> float:
    """How far the average has come from the window's first round toward the goal, 0-100."""
    if on_track or start <= goal:
        return 100.0
    return min(100.0, max(0.0, (start - average) / (start - goal) * 100))


def goal_attempts(rounds: List[Round], scoring_goal: int) -> List[Dict[str, Any]]:
    """Each scored round, oldest first, and whether it met the goal: at or under it."""
    attempts = []
    for r in rounds:
        score = r.calculate_total_score()
        if score is not None:
            attempts.append({"round_id": r.id, "score": score, "met_goal": score <= scoring_goal})
    return attempts


def goal_report(
    rounds: List[Round],
    scoring_goal: int,
    home_course_rounds: Optional[List[Round]] = None,
) -> Dict[str, Any]:
    """
    Compute a goal report for a player targeting a specific score threshold.

    Returns gap analysis and ranked list of highest-ROI improvement areas (savers).
    """
    scores = [r.calculate_total_score() for r in rounds]
    scores = [s for s in scores if s is not None]

    if not scores:
        return {
            "scoring_average": None,
            "lowest_score": None,
            "scoring_goal": scoring_goal,
            "gap": None,
            "on_track": False,
            "progress_pct": None,
            "rounds_meeting_goal": 0,
            "peak_gap": None,
            "peak_meets_goal": None,
            "attempts": [],
            "savers": [],
        }

    scoring_avg = sum(scores) / len(scores)
    # A record, so full rounds only, as the career records have it: a nine's 45 is not a round of 45.
    full_scores = [s for s in (r.calculate_total_score() for r in full_rounds(rounds)) if s is not None]
    lowest_score = min(full_scores) if full_scores else None
    gap = scoring_avg - scoring_goal
    on_track = gap <= 0
    progress_pct = _progress_pct(scores[0], scoring_avg, scoring_goal, on_track)

    savers: List[Dict[str, Any]] = []

    # A. Three-Putt Bleed
    three_putt_rows = three_putts_per_round(rounds)
    rounds_with_putt_data = [r for r in three_putt_rows if r["holes_with_putt_data"] > 0]
    if rounds_with_putt_data:
        avg_three_putts = sum(r["three_putt_count"] for r in rounds_with_putt_data) / len(rounds_with_putt_data)
        if avg_three_putts >= 0.1:
            pct = (avg_three_putts / gap * 100) if gap > 0 else 0.0
            savers.append({
                "type": "three_putt_bleed",
                "strokes_saved": round(avg_three_putts, 2),
                "percentage_of_gap": round(min(pct, 999.0), 1),
                "headline": "Cut out 3-putts",
                "detail": f"{avg_three_putts:.1f} a round",
                "data": {"avg_three_putts": round(avg_three_putts, 2)},
            })

    # B. Blowup Holes
    dist_rows = score_type_distribution_per_round(rounds)
    dist_rows_with_data = [r for r in dist_rows if r["holes_counted"] > 0]
    if dist_rows_with_data:
        avg_doubles = sum(
            (r["double_bogey"] / 100) * r["holes_counted"] for r in dist_rows_with_data
        ) / len(dist_rows_with_data)
        avg_triples_plus = sum(
            ((r["triple_bogey"] + r["quad_bogey"]) / 100) * r["holes_counted"]
            for r in dist_rows_with_data
        ) / len(dist_rows_with_data)

        # Realistic target: convert up to 2 doubles → bogeys, and up to 1 triple → bogey
        realistic_doubles = min(2.0, avg_doubles)
        realistic_triples = min(1.0, avg_triples_plus)
        realistic_save = realistic_doubles * 1.0 + realistic_triples * 2.0

        if realistic_save >= 0.1:
            pct = (realistic_save / gap * 100) if gap > 0 else 0.0
            savers.append({
                "type": "blowup_holes",
                "strokes_saved": round(realistic_save, 2),
                "percentage_of_gap": round(min(pct, 999.0), 1),
                "headline": "Turn doubles into bogeys",
                "detail": f"{avg_doubles + avg_triples_plus:.1f} doubles or worse a round",
                "data": {
                    "avg_doubles": round(avg_doubles, 2),
                    "avg_triples_plus": round(avg_triples_plus, 2),
                    "realistic_save": round(realistic_save, 2),
                },
            })

    # C. Achilles Heel (Yardage)
    yardage_buckets = scoring_by_yardage_buckets(rounds)
    eligible_buckets = [b for b in yardage_buckets if b["sample_size"] >= 10]
    if eligible_buckets:
        worst_bucket = max(eligible_buckets, key=lambda b: b["average_to_par"])
        strokes_per_round = worst_bucket["average_to_par"] * (worst_bucket["sample_size"] / max(len(rounds), 1))
        if strokes_per_round >= 0.3:
            pct = (strokes_per_round / gap * 100) if gap > 0 else 0.0
            savers.append({
                "type": "achilles_heel",
                "strokes_saved": round(strokes_per_round, 2),
                "percentage_of_gap": round(min(pct, 999.0), 1),
                "headline": f"Par {worst_bucket['par']}s from {worst_bucket['bucket_label']} yds",
                "detail": f"+{worst_bucket['average_to_par']:.1f} a hole from there",
                "data": {
                    "par": worst_bucket["par"],
                    "bucket_label": worst_bucket["bucket_label"],
                    "average_to_par": round(worst_bucket["average_to_par"], 2),
                    "sample_size": worst_bucket["sample_size"],
                },
            })

    # D. Home Course Demon
    if home_course_rounds and len(home_course_rounds) >= 5:
        profile = course_difficulty_profile_by_hole(home_course_rounds)
        if profile:
            hardest = max(profile, key=lambda h: h["average_to_par"])
            strokes_per_round = hardest["average_to_par"]
            if strokes_per_round >= 0.1:
                pct = (strokes_per_round / gap * 100) if gap > 0 else 0.0
                savers.append({
                    "type": "home_course_demon",
                    "strokes_saved": round(strokes_per_round, 2),
                    "percentage_of_gap": round(min(pct, 999.0), 1),
                    "headline": f"Hole {hardest['hole_number']} at home",
                "detail": f"+{hardest['average_to_par']:.1f} a round on it",
                "data": {
                        "hole_number": hardest["hole_number"],
                        "average_to_par": round(hardest["average_to_par"], 2),
                        "sample_size": hardest.get("sample_size", len(home_course_rounds)),
                    },
                })

    # E. GIR Opportunity
    gir_data = overall_gir_percentage(rounds)
    gir_pct = gir_data.get("gir_percentage")
    if gir_pct is not None and gir_pct < 45:
        # Each GIR miss that becomes a GIR saves roughly 0.5–0.7 strokes vs scrambling
        # Estimate: improving GIR by 10 percentage points ≈ 1 extra GIR per round ≈ 0.6 strokes saved
        improvement_headroom = 45 - gir_pct  # pp below benchmark
        realistic_gir_gain = min(improvement_headroom / 10, 3.0) * 0.6
        if realistic_gir_gain >= 0.15:
            pct = (realistic_gir_gain / gap * 100) if gap > 0 else 0.0
            savers.append({
                "type": "gir_opportunity",
                "strokes_saved": round(realistic_gir_gain, 2),
                "percentage_of_gap": round(min(pct, 999.0), 1),
                "headline": "Hit more greens",
                "detail": f"{gir_pct:.0f}% of greens",
                "data": {"gir_percentage": round(gir_pct, 1)},
            })

    # F. Scrambling Opportunity
    scrambling_rows = scrambling_per_round(rounds)
    scrambling_vals = [r["scrambling_percentage"] for r in scrambling_rows if r["scrambling_percentage"] is not None]
    if scrambling_vals:
        avg_scrambling = sum(scrambling_vals) / len(scrambling_vals)
        if avg_scrambling < 50:
            # Avg amateur scrambling ~35–40%, tour avg ~60%. Each extra save = 1 stroke.
            # Estimate GIR misses per round ≈ 18 * (1 - gir_pct/100)
            gir_pct_for_scramble = gir_data.get("gir_percentage") or 33.0
            misses_per_round = 18 * (1 - gir_pct_for_scramble / 100)
            scramble_gap = 50 - avg_scrambling  # pp below benchmark
            realistic_saves = min(scramble_gap / 100, 0.15) * misses_per_round
            if realistic_saves >= 0.15:
                pct = (realistic_saves / gap * 100) if gap > 0 else 0.0
                savers.append({
                    "type": "scrambling_opportunity",
                    "strokes_saved": round(realistic_saves, 2),
                    "percentage_of_gap": round(min(pct, 999.0), 1),
                    "headline": "Save more pars after a miss",
                "detail": f"{avg_scrambling:.0f}% scrambling",
                "data": {"scrambling_percentage": round(avg_scrambling, 1)},
                })

    # G. Par 5 Opportunity
    par_rows = scoring_by_par(rounds)
    par5_row = next((r for r in par_rows if r["par"] == 5), None)
    if par5_row and par5_row["sample_size"] >= 6 and par5_row["average_to_par"] > 0.4:
        # Par 5s should average close to par for mid-handicappers; each hole played = 1/18 of round
        par5_per_round = par5_row["sample_size"] / max(len(rounds), 1)
        # Realistic improvement: cut 0.5 strokes off each par 5
        realistic_save = min(par5_row["average_to_par"] - 0.3, 0.8) * par5_per_round
        if realistic_save >= 0.15:
            pct = (realistic_save / gap * 100) if gap > 0 else 0.0
            savers.append({
                "type": "par5_opportunity",
                "strokes_saved": round(realistic_save, 2),
                "percentage_of_gap": round(min(pct, 999.0), 1),
                "headline": "Score on par 5s",
                "detail": f"+{par5_row['average_to_par']:.1f} a hole on them",
                "data": {
                    "average_to_par": round(par5_row["average_to_par"], 2),
                    "sample_size": par5_row["sample_size"],
                },
            })

    savers.sort(key=lambda s: s["strokes_saved"], reverse=True)
    savers = [s for s in savers if s["strokes_saved"] >= 0.1]

    return {
        "scoring_average": round(scoring_avg, 1),
        "lowest_score": lowest_score,
        "scoring_goal": scoring_goal,
        "gap": round(gap, 1),
        "on_track": on_track,
        "progress_pct": progress_pct,
        "rounds_meeting_goal": sum(1 for s in scores if s <= scoring_goal),
        "peak_gap": peak_gap(rounds, scoring_goal),
        "peak_meets_goal": peak_meets_goal(rounds, scoring_goal),
        "attempts": goal_attempts(rounds, scoring_goal),
        "savers": savers,
    }
