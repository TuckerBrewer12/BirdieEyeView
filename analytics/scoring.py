from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.handicap import round_course_handicap, round_half_up
from analytics.score_types import SCORE_KINDS, SCORE_TYPE_ORDER, score_type_from_to_par
from analytics.windows import rolling_average
from models.hole_score import score_kind
from models.round import Round


def _normalize_tee_label(value: Optional[str]) -> str:
    if not value:
        return ""
    normalized = value.lower()
    normalized = normalized.replace("tees", "").replace("tee", "")
    normalized = "".join(ch for ch in normalized if ch.isalnum())
    return normalized


def _resolve_tee_for_yardage(round_obj: Round) -> Optional[Any]:
    tee = round_obj.get_tee()
    if tee and tee.hole_yardages:
        return tee

    if round_obj.course and round_obj.tee_box:
        requested = _normalize_tee_label(round_obj.tee_box)
        if requested:
            exact = [
                candidate
                for candidate in round_obj.course.tees
                if candidate.color and _normalize_tee_label(candidate.color) == requested and candidate.hole_yardages
            ]
            if len(exact) == 1:
                return exact[0]

    if round_obj.user_tee and round_obj.user_tee.hole_yardages:
        return round_obj.user_tee

    if round_obj.course and not round_obj.tee_box:
        populated = [candidate for candidate in round_obj.course.tees if candidate.hole_yardages]
        if len(populated) == 1:
            return populated[0]

    return None


def score_trend(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        complete = round_obj.is_complete()
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "score_counts": {kind: round_obj.get_score_counts().get(kind, 0) for kind in SCORE_KINDS},
                "par": round_obj.get_par(),
                "total_score": round_obj.calculate_total_score() if complete else None,
                "to_par": round_obj.total_to_par() if complete else None,
                "course_name": course_name,
                "holes": el.round_format(round_obj),
            }
        )
    return results


def net_score_trend(
    rounds: Iterable[Round],
    current_handicap_index: Optional[float],
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        complete = round_obj.is_complete()
        handicap = round_course_handicap(round_obj, current_handicap_index) if complete else None
        course_name = (
            round_obj.course.name if round_obj.course else round_obj.course_name_played
        )
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "gross_score": round_obj.calculate_total_score() if complete else None,
                "course_handicap": handicap,
                "net_score": round_obj.calculate_net_score(handicap),
                "course_name": course_name,
                "to_par": round_obj.total_to_par() if complete else None,
            }
        )
    return results


def score_trend_on_this_course(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    ordered_rounds = list(enumerate(el.chronological(rounds)))

    results: List[Dict[str, Any]] = []
    for index, (_, round_obj) in enumerate(ordered_rounds, start=1):
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "date": round_obj.date,
                "total_score": round_obj.calculate_total_score() if round_obj.is_complete() else None,
                "to_par": round_obj.total_to_par() if round_obj.is_complete() else None,
                "holes": el.round_format(round_obj),
            }
        )
    return results


def scoring_vs_hole_handicap(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_handicap: Dict[int, List[int]] = {}

    for round_obj, hole_score, par in el.observed_holes(rounds):
        handicap = el.hole_handicap(round_obj, hole_score.hole_number)
        if handicap is None:
            continue
        by_handicap.setdefault(handicap, []).append(hole_score.strokes - par)

    results: List[Dict[str, Any]] = []
    for handicap in sorted(by_handicap):
        values = by_handicap[handicap]
        results.append(
            {
                "handicap": handicap,
                "average_to_par": sum(values) / len(values),
                "sample_size": len(values),
            }
        )

    hardest = {r["handicap"] for r in sorted(results, key=lambda r: r["average_to_par"], reverse=True)[:3]}
    for row in results:
        row["hardest"] = row["handicap"] in hardest
    return results


def scoring_by_par(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_par: Dict[int, List[int]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
        if par in (3, 4, 5):
            by_par.setdefault(par, []).append(hole_score.strokes)

    results: List[Dict[str, Any]] = []
    for par in sorted(by_par):
        strokes = by_par[par]
        avg_strokes = sum(strokes) / len(strokes)
        results.append(
            {
                "par": par,
                "average_to_par": avg_strokes - par,
                "average_strokes": avg_strokes,
                "sample_size": len(strokes),
            }
        )
    return results


YARDAGE_BUCKETS = {
    3: [
        (0,   149,  0, "< 150"),
        (150, 199,  1, "150–199"),
        (200, 9999, 2, "200+"),
    ],
    4: [
        (0,   349,  0, "< 350"),
        (350, 399,  1, "350–399"),
        (400, 449,  2, "400–449"),
        (450, 9999, 3, "450+"),
    ],
    5: [
        (0,   499,  0, "< 500"),
        (500, 549,  1, "500–549"),
        (550, 9999, 2, "550+"),
    ],
}


def scoring_by_yardage_buckets(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_bucket: Dict[tuple, Dict[str, Any]] = {}

    for round_obj in rounds:
        tee = _resolve_tee_for_yardage(round_obj)
        if not tee:
            continue

        for _, hole_score, par in el.observed_holes([round_obj]):
            if par not in (3, 4, 5):
                continue

            yardage = tee.hole_yardages.get(hole_score.hole_number)
            if yardage is None:
                continue

            for (lo, hi, order, label) in YARDAGE_BUCKETS[par]:
                if lo <= yardage <= hi:
                    key = (par, order)
                    if key not in by_bucket:
                        by_bucket[key] = {"par": par, "order": order, "label": label, "to_par": [], "yardages": [], "gir": []}
                    by_bucket[key]["to_par"].append(hole_score.strokes - par)
                    by_bucket[key]["yardages"].append(yardage)
                    if hole_score.green_in_regulation is not None:
                        by_bucket[key]["gir"].append(1 if hole_score.green_in_regulation else 0)
                    break

    results: List[Dict[str, Any]] = []
    for key in sorted(by_bucket):
        entry = by_bucket[key]
        to_par_vals = entry["to_par"]
        gir_vals = entry["gir"]
        results.append({
            "par": entry["par"],
            "bucket_label": entry["label"],
            "bucket_order": entry["order"],
            "average_to_par": sum(to_par_vals) / len(to_par_vals),
            "average_strokes": entry["par"] + sum(to_par_vals) / len(to_par_vals),
            "score_mix": score_mix_from_to_par(to_par_vals),
            "gir_percentage": (sum(gir_vals) / len(gir_vals) * 100.0) if gir_vals else None,
            "sample_size": len(to_par_vals),
            "raw_scores": [{"to_par": tp, "yardage": y} for tp, y in zip(to_par_vals, entry["yardages"])],
            "worst": False,
        })
    for par in {row["par"] for row in results}:
        bands = [row for row in results if row["par"] == par]
        if len(bands) > 1:
            max(bands, key=lambda row: row["average_to_par"])["worst"] = True
    return results


def score_type_distribution_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []

    for index, round_obj in enumerate(rounds, start=1):
        counts = {name: 0 for name in SCORE_TYPE_ORDER}
        total = 0

        for _, hole_score, par in el.observed_holes([round_obj]):
            counts[score_type_from_to_par(hole_score.strokes - par)] += 1
            total += 1

        row: Dict[str, Any] = {
            "round_index": index,
            "round_id": round_obj.id,
            "holes_counted": total,
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (counts[name] / total * 100.0) if total else None
        results.append(row)

    return results


def score_trend_with_rolling_average(rounds: Iterable[Round], window: int = 5) -> List[Dict[str, Any]]:
    rows = score_trend(rounds)
    for row, average in zip(rows, rolling_average([row["total_score"] for row in rows], window)):
        row["rolling_average"] = average
    return rows


def score_mix_from_to_par(to_pars: List[int]) -> Dict[str, float]:
    counts = {kind: 0 for kind in SCORE_KINDS}
    for kind in filter(None, map(score_kind, to_pars)):
        counts[kind] += 1
    return {kind: round_half_up(count / len(to_pars) * 100, 2) if to_pars else 0.0 for kind, count in counts.items()}
