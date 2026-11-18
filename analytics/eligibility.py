from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional

from models import HoleScore, Round
from models.hole_layout import FULL_ROUND

EIGHTEEN = 18
NINE = 9


def scored_holes(round_obj: Round) -> List[HoleScore]:
    scored = round_obj.scored_holes()
    return sorted(scored or [], key=lambda score: score.hole_number)


def hole_par(round_obj: Round, hole_number: int) -> Optional[int]:
    return round_obj.get_hole_par(hole_number)


def hole_handicap(round_obj: Round, hole_number: int) -> Optional[int]:
    score = round_obj.get_hole_score(hole_number)
    if score is not None and score.handicap_played is not None:
        return score.handicap_played
    if round_obj.course is not None:
        hole = round_obj.course.get_hole(hole_number)
        if hole is not None:
            return hole.handicap
    return None


def observed_holes(rounds: Iterable[Round]):
    for round_obj in rounds:
        for score in scored_holes(round_obj):
            par = hole_par(round_obj, score.hole_number)
            if par is not None:
                yield round_obj, score, par


def round_format(round_obj: Round) -> Optional[int]:
    intended = round_obj.get_intended_holes()
    if intended is None:
        return None
    return EIGHTEEN if intended == FULL_ROUND else NINE


def is_complete(round_obj: Round) -> bool:
    return round_obj.is_complete()


def complete_rounds(rounds: Iterable[Round], holes: Optional[int] = None) -> List[Round]:
    return [
        r for r in rounds
        if r.is_complete() and (holes is None or round_format(r) == holes)
    ]


def by_format(rounds: Iterable[Round]) -> Dict[int, List[Round]]:
    grouped: Dict[int, List[Round]] = {EIGHTEEN: [], NINE: []}
    for round_obj in complete_rounds(rounds):
        grouped[round_format(round_obj)].append(round_obj)
    return grouped


@dataclass(frozen=True)
class Rate:
    successes: int
    opportunities: int

    @property
    def percentage(self) -> Optional[float]:
        return 100.0 * self.successes / self.opportunities if self.opportunities else None

    @property
    def ratio(self) -> Optional[float]:
        return self.successes / self.opportunities if self.opportunities else None


def average(values: Iterable[Optional[float]]) -> Optional[float]:
    known = [v for v in values if v is not None]
    return sum(known) / len(known) if known else None


def comparable_datetime(moment: datetime) -> datetime:
    if moment.tzinfo is not None:
        return moment.astimezone(timezone.utc).replace(tzinfo=None)
    return moment


def date_key(round_obj: Round):
    if round_obj.date is None:
        return (1, 0)
    return (0, comparable_datetime(round_obj.date))


def chronological(rounds: Iterable[Round]) -> List[Round]:
    return sorted(rounds, key=date_key)
