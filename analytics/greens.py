from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.score_types import SCORE_TYPE_ORDER, score_type_from_to_par
from models.round import Round


def _missed_green_holes(round_obj: Round):
    for score in el.scored_holes(round_obj):
        if score.green_in_regulation is False:
            par = el.hole_par(round_obj, score.hole_number)
            if par is not None:
                yield score, par


def _scramble_rate(round_obj: Round) -> el.Rate:
    holes = list(_missed_green_holes(round_obj))
    return el.Rate(sum(1 for score, par in holes if score.strokes <= par), len(holes))


def _up_and_down_rate(round_obj: Round) -> el.Rate:
    holes = [(score, par) for score, par in _missed_green_holes(round_obj) if score.putts is not None]
    return el.Rate(sum(1 for score, par in holes if score.putts <= 1 and score.strokes <= par), len(holes))


def scrambling_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        rate = _scramble_rate(round_obj)
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "scramble_opportunities": rate.opportunities,
                "scramble_successes": rate.successes,
                "scramble_failures": rate.opportunities - rate.successes,
                "scrambling_percentage": rate.percentage,
            }
        )
    return results


def _overall_rate(rates: Iterable[el.Rate]) -> Dict[str, Optional[float]]:
    rates = list(rates)
    total = el.Rate(sum(r.successes for r in rates), sum(r.opportunities for r in rates))
    return {"successes": total.successes, "opportunities": total.opportunities, "percentage": total.percentage}


def overall_scrambling(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    return _overall_rate(_scramble_rate(r) for r in rounds)


def overall_up_and_down(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    return _overall_rate(_up_and_down_rate(r) for r in rounds)


def gir_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        holes_played = len(el.scored_holes(round_obj))
        total_gir = round_obj.get_total_gir()
        gir_percentage: Optional[float] = None
        if holes_played and total_gir is not None:
            gir_percentage = (total_gir / holes_played) * 100

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_gir": total_gir,
                "holes_played": holes_played,
                "gir_percentage": gir_percentage,
            }
        )
    return results


def overall_gir_percentage(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    total_holes = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        observed = [s.green_in_regulation for s in el.scored_holes(round_obj) if s.green_in_regulation is not None]
        if observed:
            rounds_with_data += 1
        total_holes += len(observed)
        total_gir += sum(1 for hit in observed if hit)

    return {
        "rounds_with_data": float(rounds_with_data),
        "holes_played": float(total_holes),
        "total_gir": float(total_gir),
        "total_missed_gir": float(total_holes - total_gir),
        "gir_percentage": (total_gir / total_holes) * 100 if total_holes else None,
    }


def gir_vs_non_gir_score_distribution(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    buckets = {
        "GIR": {name: 0 for name in SCORE_TYPE_ORDER},
        "No GIR": {name: 0 for name in SCORE_TYPE_ORDER},
    }
    totals = {"GIR": 0, "No GIR": 0}

    for round_obj in rounds:
        for hole_score in el.scored_holes(round_obj):
            if hole_score.green_in_regulation is None:
                continue

            par = el.hole_par(round_obj, hole_score.hole_number)
            if par is None:
                continue

            bucket = "GIR" if hole_score.green_in_regulation else "No GIR"
            score_type = score_type_from_to_par(hole_score.strokes - par)
            buckets[bucket][score_type] += 1
            totals[bucket] += 1

    results: List[Dict[str, Any]] = []
    for bucket in ("GIR", "No GIR"):
        row: Dict[str, Any] = {
            "bucket": bucket,
            "holes_counted": totals[bucket],
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (buckets[bucket][name] / totals[bucket] * 100.0) if totals[bucket] else None
        results.append(row)

    return results


def average_score_when_gir_vs_missed(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    buckets: Dict[str, Dict[str, float]] = {
        "GIR": {"strokes_sum": 0.0, "to_par_sum": 0.0, "holes_counted": 0.0},
        "No GIR": {"strokes_sum": 0.0, "to_par_sum": 0.0, "holes_counted": 0.0},
    }

    for round_obj in rounds:
        for hole_score in el.scored_holes(round_obj):
            if hole_score.green_in_regulation is None:
                continue

            par = el.hole_par(round_obj, hole_score.hole_number)
            if par is None:
                continue

            bucket = "GIR" if hole_score.green_in_regulation else "No GIR"
            entry = buckets[bucket]
            entry["strokes_sum"] += hole_score.strokes
            entry["to_par_sum"] += hole_score.strokes - par
            entry["holes_counted"] += 1

    results: List[Dict[str, Any]] = []
    for bucket in ("GIR", "No GIR"):
        holes = int(buckets[bucket]["holes_counted"])
        strokes_sum = buckets[bucket]["strokes_sum"]
        to_par_sum = buckets[bucket]["to_par_sum"]
        results.append(
            {
                "bucket": bucket,
                "holes_counted": holes,
                "average_score": (strokes_sum / holes) if holes else None,
                "average_to_par": (to_par_sum / holes) if holes else None,
            }
        )

    return results
