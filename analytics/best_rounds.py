from typing import Any, Dict, Iterable, List, Optional

from analytics import eligibility as el
from models.round import Round


def full_rounds(rounds: Iterable[Round]) -> List[Round]:
    return el.complete_rounds(rounds, el.EIGHTEEN)


def best_round(rounds: List[Round]) -> Optional[Round]:
    ranks = best_round_ranks(rounds)
    return next((rounds[i] for i, place in ranks.items() if place == 1), None)


def worst_round(rounds: List[Round]) -> Optional[Round]:
    ranks = worst_round_ranks(rounds)
    return next((rounds[i] for i, place in ranks.items() if place == 1), None)


def best_round_ranks(rounds: List[Round]) -> Dict[int, int]:
    ranked = sorted((i for i,r in enumerate(rounds) if r.is_complete() and el.round_format(r) == el.EIGHTEEN),
                    key=lambda i: rounds[i].calculate_total_score())
    return {i: place for place,i in enumerate(ranked, start=1)}


def worst_round_ranks(rounds: List[Round]) -> Dict[int, int]:
    ranked = sorted((i for i,r in enumerate(rounds) if r.is_complete() and el.round_format(r) == el.EIGHTEEN),
                    key=lambda i: -rounds[i].calculate_total_score())
    return {i: place for place,i in enumerate(ranked, start=1)}


def course_record(rounds: List[Round]) -> Dict[str, Any]:
    full = full_rounds(rounds)
    counted = full
    scores = [s for s in (r.calculate_total_score() for r in counted) if s is not None]
    to_pars = [t for t in (r.total_to_par() for r in counted) if t is not None]
    dates = [r.date for r in rounds if r.date is not None]
    return {
        "rounds_played": len(rounds),
        "last_played": max(dates) if dates else None,
        "scoring_average": sum(scores) / len(scores) if scores else None,
        "scoring_average_to_par": sum(to_pars) / len(to_pars) if to_pars else None,
        "best_round": best_round(rounds),
        "worst_round": worst_round(rounds),
    }
