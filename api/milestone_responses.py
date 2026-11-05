"""The golfer's lifetime firsts for `GET /stats/milestones/{user}`, built in one place."""

from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from analytics import stats as analytics
from api.schemas import LifetimeMilestone, LifetimeMilestonesResponse, LifetimeMilestoneType
from models import Round

# The thresholds are out of 18 holes: GIR breaks count full rounds only.
GIR_HOLES = 18


def _event(kind: LifetimeMilestoneType, label: str, achievement: Dict[str, Any]) -> LifetimeMilestone:
    return LifetimeMilestone(
        type=kind,
        label=label,
        date=achievement["date"],
        course=achievement["course"],
        round_id=achievement.get("round_id"),
    )


def _first(
    kind: LifetimeMilestoneType, label: str, achievement: Optional[Dict[str, Any]]
) -> List[LifetimeMilestone]:
    """A one-off first, if the golfer has it."""
    return [_event(kind, label, achievement)] if achievement else []


def _breaks(
    kind: LifetimeMilestoneType, label: Callable[[int], str], rows: List[Dict[str, Any]]
) -> List[LifetimeMilestone]:
    """Each threshold the golfer has reached, in the order analytics lists them."""
    return [_event(kind, label(row["threshold"]), row["achievement"]) for row in rows if row["achievement"]]


def _day(raw: str) -> datetime:
    try:
        return datetime.strptime(raw, "%Y/%m/%d")
    except ValueError:
        return datetime.min


def milestone_events(achievements: Dict[str, Any]) -> List[LifetimeMilestone]:
    """Every lifetime first in `analytics.stats.notable_achievements`, newest first.

    Firsts set by the same round keep this order: score breaks, under par, eagle, hole in one,
    GIR breaks, putt breaks.
    """
    rounds = achievements["round_milestones"]["lifetime"]
    gir = achievements["gir_milestones"]["lifetime"]
    putting = achievements["putting_milestones"]["lifetime"]
    events = [
        *_breaks("score_break", lambda t: f"First to break {t}", rounds["score_breaks"]),
        *_first("under_par", "First round under par", rounds["first_round_under_par"]),
        *_first("eagle", "First eagle", rounds["first_eagle"]),
        *_first("hole_in_one", "Hole in one", rounds["first_hole_in_one"]),
        *_breaks(
            "gir_break",
            lambda t: f"First {t} GIR in a round ({round(t / GIR_HOLES * 100)}%)",
            gir["gir_breaks"],
        ),
        *_breaks("putt_break", lambda t: f"First round under {t} putts", putting["putt_breaks"]),
    ]
    # Dates are YYYY/M/D, so compare them as dates, not text. The sort is stable, so a round's
    # own firsts keep the order above.
    return sorted(events, key=lambda e: _day(e.date), reverse=True)


def milestones_response(
    rounds: List[Round], *, home_course_id: Optional[str], limit: int
) -> LifetimeMilestonesResponse:
    """The newest `limit` lifetime firsts over the golfer's rounds (oldest first)."""
    if not rounds:
        return LifetimeMilestonesResponse(milestones=[])
    achievements = analytics.notable_achievements(rounds, home_course_id=home_course_id)
    return LifetimeMilestonesResponse(milestones=milestone_events(achievements)[:limit])
