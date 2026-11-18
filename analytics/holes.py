from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.score_types import SCORE_KINDS, SCORE_TYPE_ORDER, score_type_from_to_par
from analytics.verdicts import putts_verdict
from models.hole import HOLES_PER_ROUND
from models.hole_layout import BACK_NINE, FRONT_NINE
from models.round import Round

MIN_CONSISTENCY_OBSERVATIONS = 3


def _scored_holes_any_par(rounds: Iterable[Round]):
    for round_obj in rounds:
        for score in el.scored_holes(round_obj):
            yield round_obj, score, el.hole_par(round_obj, score.hole_number)


def score_variance_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "strokes": []},
        )
        entry["strokes"].append(hole_score.strokes)

    rows: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        strokes: List[int] = entry["strokes"]
        sample_size = len(strokes)
        mean_score = sum(strokes) / sample_size
        variance = sum((score - mean_score) ** 2 for score in strokes) / sample_size
        rows.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "sample_size": sample_size,
                "average_score": mean_score,
                "score_variance": variance,
                "score_std_dev": math.sqrt(variance),
            }
        )

    ranked = [row for row in rows if row["sample_size"] >= MIN_CONSISTENCY_OBSERVATIONS]
    ranked.sort(key=lambda row: (-row["score_std_dev"], row["hole_number"]))
    for rank, row in enumerate(ranked, start=1):
        row["variance_rank"] = rank
    unranked = [row for row in rows if row["sample_size"] < MIN_CONSISTENCY_OBSERVATIONS]
    for row in unranked:
        row["variance_rank"] = None
    return ranked + unranked


def average_score_relative_to_par_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "strokes": [], "to_par": []},
        )
        entry["strokes"].append(hole_score.strokes)
        entry["to_par"].append(hole_score.strokes - par)

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        strokes: List[int] = entry["strokes"]
        to_par: List[int] = entry["to_par"]
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "average_score": sum(strokes) / len(strokes),
                "average_to_par": sum(to_par) / len(to_par),
                "sample_size": len(strokes),
            }
        )

    return results


def course_difficulty_profile_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    rows = average_score_relative_to_par_by_hole(rounds)
    rows.sort(key=lambda row: (-row["average_to_par"], row["hole_number"]))
    for index, row in enumerate(rows, start=1):
        row["difficulty_rank"] = index
    return rows


def gir_percentage_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _scored_holes_any_par(rounds):
        if hole_score.green_in_regulation is None:
            continue
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "gir_hits": 0, "sample_size": 0},
        )
        entry["sample_size"] += 1
        if hole_score.green_in_regulation:
            entry["gir_hits"] += 1

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        rate = el.Rate(entry["gir_hits"], entry["sample_size"])
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "gir_hits": rate.successes,
                "sample_size": rate.opportunities,
                "gir_percentage": rate.percentage,
            }
        )

    return results


def average_putts_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in _scored_holes_any_par(rounds):
        if hole_score.putts is None:
            continue
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {"hole_number": hole_score.hole_number, "par": par, "putts": []},
        )
        entry["putts"].append(hole_score.putts)

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        putts: List[int] = entry["putts"]
        results.append(
            {
                "hole_number": hole_number,
                "par": entry["par"],
                "average_putts": sum(putts) / len(putts),
                "sample_size": len(putts),
            }
        )

    return results


def score_type_distribution_by_hole(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    by_hole: Dict[int, Dict[str, Any]] = {}

    for _, hole_score, par in el.observed_holes(rounds):
        entry = by_hole.setdefault(
            hole_score.hole_number,
            {
                "hole_number": hole_score.hole_number,
                "par": par,
                "counts": {name: 0 for name in SCORE_TYPE_ORDER},
                "sample_size": 0,
            },
        )
        entry["counts"][score_type_from_to_par(hole_score.strokes - par)] += 1
        entry["sample_size"] += 1

    results: List[Dict[str, Any]] = []
    for hole_number in sorted(by_hole):
        entry = by_hole[hole_number]
        sample_size = entry["sample_size"]
        row: Dict[str, Any] = {
            "hole_number": hole_number,
            "par": entry["par"],
            "sample_size": sample_size,
        }
        for name in SCORE_TYPE_ORDER:
            row[name] = (entry["counts"][name] / sample_size) * 100.0
        results.append(row)

    return results


def course_hole_stats(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    rounds = list(rounds)
    to_par = {row["hole_number"]: row for row in average_score_relative_to_par_by_hole(rounds)}
    rank = {row["hole_number"]: row["difficulty_rank"] for row in course_difficulty_profile_by_hole(rounds)}
    spread = {row["hole_number"]: row for row in score_variance_by_hole(rounds)}
    greens = {row["hole_number"]: row for row in gir_percentage_by_hole(rounds)}
    putts = {row["hole_number"]: row for row in average_putts_by_hole(rounds)}
    mix = {row["hole_number"]: row for row in score_type_distribution_by_hole(rounds)}
    rows: List[Dict[str, Any]] = []
    for hole_number in sorted(to_par):
        row = to_par[hole_number]
        played = row["sample_size"]
        kinds = mix.get(hole_number)
        average_putts = putts[hole_number]["average_putts"] if hole_number in putts else None
        rows.append(
            {
                "hole_number": hole_number,
                "par": row["par"],
                "sample_size": played,
                "average_score": row["average_score"],
                "average_to_par": row["average_to_par"],
                "difficulty_rank": rank[hole_number],
                "score_std_dev": spread[hole_number]["score_std_dev"] if played >= 2 and hole_number in spread else None,
                "gir_percentage": greens[hole_number]["gir_percentage"] if hole_number in greens else None,
                "average_putts": average_putts,
                "putts_verdict": putts_verdict(average_putts),
                "score_mix": {
                    kind: kinds[name] if kinds else 0.0
                    for kind, name in zip(SCORE_KINDS, SCORE_TYPE_ORDER)
                },
            }
        )
    return rows


def gir_percentage_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    def share(holes: range) -> Optional[float]:
        rows = [row for row in by_hole if row["hole_number"] in holes]
        samples = sum(row["sample_size"] for row in rows)
        return sum(row["gir_hits"] for row in rows) / samples * 100.0 if samples else None

    return {"front_nine": share(FRONT_NINE), "back_nine": share(BACK_NINE), "total": share(range(1, HOLES_PER_ROUND + 1))}


def hole_to_par_nines(by_hole: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    def total(holes: range) -> Optional[float]:
        averages = [row["average_to_par"] for row in by_hole if row["hole_number"] in holes]
        return sum(averages) if averages else None

    return {"front_nine": total(FRONT_NINE), "back_nine": total(BACK_NINE), "total": total(range(1, HOLES_PER_ROUND + 1))}
