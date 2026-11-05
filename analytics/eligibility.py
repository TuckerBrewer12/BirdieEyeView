"""Which rounds, holes and observations each analytics metric may use.

One place for the rules every metric shares, so metrics stop re-deriving them differently:

- A **scored hole** is a numbered, uniquely identified hole with known strokes that wasn't marked
  unplayed: the same set ``Round`` totals use.
- **Round-level results** (averages, records, milestones, goals, handicap) use complete rounds only,
  grouped by format. Nine-hole rounds are never doubled into eighteen-hole equivalents.
- **Hole-level metrics** use every scored hole, nine- and eighteen-hole rounds combined.
- Par and hole handicap follow the round's historical values first, then the linked course.
- A rate with no opportunities is unknown (``None``), never zero.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Iterable, List, Optional

from models import HoleScore, Round
from models.hole_layout import FULL_ROUND

EIGHTEEN = 18
NINE = 9


def scored_holes(round_obj: Round) -> List[HoleScore]:
    """Scored holes in hole order; empty when hole identities are ambiguous."""
    scored = round_obj._scored_holes()
    return sorted(scored or [], key=lambda score: score.hole_number)


def hole_par(round_obj: Round, hole_number: int) -> Optional[int]:
    return round_obj.get_hole_par(hole_number)


def hole_handicap(round_obj: Round, hole_number: int) -> Optional[int]:
    """Handicap rank played first, then the linked course hole's rank."""
    score = round_obj.get_hole_score(hole_number)
    if score is not None and score.handicap_played is not None:
        return score.handicap_played
    if round_obj.course is not None:
        hole = round_obj.course.get_hole(hole_number)
        if hole is not None:
            return hole.handicap
    return None


def round_format(round_obj: Round) -> Optional[int]:
    """9 or 18 from the round's intended holes; None when the format is unknown."""
    intended = round_obj.get_intended_holes()
    if intended is None:
        return None
    return EIGHTEEN if intended == FULL_ROUND else NINE


def is_complete(round_obj: Round) -> bool:
    return round_obj.is_complete()


def complete_rounds(rounds: Iterable[Round], holes: Optional[int] = None) -> List[Round]:
    """Complete rounds, optionally only one format (9 or 18), in input order."""
    return [
        r for r in rounds
        if r.is_complete() and (holes is None or round_format(r) == holes)
    ]


def by_format(rounds: Iterable[Round]) -> Dict[int, List[Round]]:
    """Complete rounds grouped as ``{18: [...], 9: [...]}``."""
    grouped: Dict[int, List[Round]] = {EIGHTEEN: [], NINE: []}
    for round_obj in complete_rounds(rounds):
        grouped[round_format(round_obj)].append(round_obj)
    return grouped


@dataclass(frozen=True)
class Rate:
    """A success rate with the evidence behind it."""

    successes: int
    opportunities: int

    @property
    def percentage(self) -> Optional[float]:
        return 100.0 * self.successes / self.opportunities if self.opportunities else None

    @property
    def ratio(self) -> Optional[float]:
        return self.successes / self.opportunities if self.opportunities else None


def average(values: Iterable[Optional[float]]) -> Optional[float]:
    """Mean of the known values; None when nothing is known."""
    known = [v for v in values if v is not None]
    return sum(known) / len(known) if known else None


def comparable_datetime(moment: datetime) -> datetime:
    """Naive datetime for comparisons: aware values become naive UTC, naive values are kept."""
    if moment.tzinfo is not None:
        return moment.astimezone(timezone.utc).replace(tzinfo=None)
    return moment


def date_key(round_obj: Round):
    """Chronological sort key: dated rounds by date, undated rounds last."""
    if round_obj.date is None:
        return (1, datetime.min)
    return (0, comparable_datetime(round_obj.date))


def chronological(rounds: Iterable[Round]) -> List[Round]:
    """Rounds oldest first by date; undated rounds keep their order at the end."""
    return sorted(rounds, key=date_key)
