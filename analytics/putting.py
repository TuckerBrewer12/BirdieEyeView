from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from analytics.handicap import round_half_up
from models.round import Round


def putts_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "total_putts": round_obj.get_total_putts(),
                "holes_played": len(el.scored_holes(round_obj)),
            }
        )
    return results


def three_putts_per_round(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        scores_with_putts = [score for score in el.scored_holes(round_obj) if score.putts is not None]
        holes_with_putt_data = len(scores_with_putts)
        rate = el.Rate(sum(1 for score in scores_with_putts if score.putts >= 3), holes_with_putt_data)
        three_putt_count = rate.successes if holes_with_putt_data else None
        three_putt_percentage = rate.percentage

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "three_putt_count": three_putt_count,
                "costly": three_putt_count is not None and three_putt_count >= 3,
                "holes_with_putt_data": holes_with_putt_data,
                "three_putt_percentage": three_putt_percentage,
            }
        )
    return results


def putts_per_gir(rounds: Iterable[Round]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for index, round_obj in enumerate(rounds, start=1):
        gir_scores = [score for score in el.scored_holes(round_obj) if score.green_in_regulation is True]
        gir_count = len(gir_scores)
        known = [score.putts for score in gir_scores if score.putts is not None]
        gir_with_putt_data = len(known)
        putts_on_gir = sum(known) if known else None
        metric = (putts_on_gir / gir_with_putt_data) if gir_with_putt_data else None

        results.append(
            {
                "round_index": index,
                "round_id": round_obj.id,
                "putts_on_gir": putts_on_gir,
                "gir_count": gir_count,
                "gir_with_putt_data": gir_with_putt_data,
                "putts_per_gir": metric,
            }
        )
    return results


def overall_putts_per_gir(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    total_putts_on_gir = 0
    total_gir = 0
    rounds_with_data = 0

    for round_obj in rounds:
        known = [
            score.putts for score in el.scored_holes(round_obj)
            if score.green_in_regulation is True and score.putts is not None
        ]
        if known:
            rounds_with_data += 1
        total_gir += len(known)
        total_putts_on_gir += sum(known)

    return {
        "rounds_with_data": float(rounds_with_data),
        "total_gir": float(total_gir),
        "total_putts_on_gir": float(total_putts_on_gir),
        "putts_per_gir": (total_putts_on_gir / total_gir) if total_gir else None,
    }


def putts_per_hole(rounds: Iterable[Round]) -> Dict[str, Any]:
    putts = [score.putts for r in rounds for score in el.scored_holes(r) if score.putts is not None]
    if not putts:
        return {"holes": 0, "one_or_fewer": 0.0, "two": 0.0, "three_or_more": 0.0}

    def share(count: int) -> float:
        return round_half_up(count / len(putts) * 100, 2)

    return {
        "holes": len(putts),
        "one_or_fewer": share(sum(1 for p in putts if p <= 1)),
        "two": share(sum(1 for p in putts if p == 2)),
        "three_or_more": share(sum(1 for p in putts if p >= 3)),
    }


def three_putt_averages(rounds: Iterable[Round]) -> Dict[str, Optional[float]]:
    rounds = list(rounds)
    recorded = [row for row in three_putts_per_round(rounds) if row["holes_with_putt_data"] > 0]
    covered = [r for r in el.complete_rounds(rounds, el.EIGHTEEN) if all(s.putts is not None for s in el.scored_holes(r))]
    counts = [row["three_putt_count"] for row in three_putts_per_round(covered)]
    holes = sum(row["holes_with_putt_data"] for row in recorded)
    return {
        "per_round": round_half_up(sum(counts) / len(counts), 1) if counts else None,
        "rate": round_half_up(sum(row["three_putt_count"] for row in recorded) / holes * 100, 1) if holes else None,
    }
