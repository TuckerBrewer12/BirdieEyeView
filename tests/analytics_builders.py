"""Small real-model builders for analytics tests (no patched collaborators)."""

from datetime import datetime
from typing import Dict, Iterable, Optional

from models import Course, Hole, HoleScore, Round, Tee
from models.hole_layout import FRONT_NINE, FULL_ROUND

# A typical par-72 layout: par 3s on 3/7/12/16, par 5s on 5/9/13/18, par 4s elsewhere.
PARS_18 = {n: 4 for n in FULL_ROUND} | {3: 3, 7: 3, 12: 3, 16: 3, 5: 5, 9: 5, 13: 5, 18: 5}
PARS_9 = {n: PARS_18[n] for n in FRONT_NINE}


def course(holes: int = 18, *, course_id: str = "course-1", rating: Optional[float] = None,
           slope: Optional[float] = None, yardage: int = 400) -> Course:
    pars = PARS_18 if holes == 18 else PARS_9
    tees = []
    if rating is not None or slope is not None:
        tees = [Tee(color="Blue", course_rating=rating, slope_rating=slope,
                    hole_yardages={n: yardage for n in pars})]
    return Course(
        id=course_id,
        name="Test Course",
        total_holes=holes,
        holes=[Hole(number=n, par=p, handicap=n) for n, p in pars.items()],
        tees=tees,
    )


def round_(scores: Dict[int, dict], *, course_obj: Optional[Course] = None, round_id: str = "r",
           date: Optional[datetime] = datetime(2026, 1, 1), intended: Optional[Iterable[int]] = None,
           tee_box: Optional[str] = None) -> Round:
    """``scores`` maps hole number to HoleScore fields, e.g. ``{1: {"strokes": 4, "putts": 2}}``."""
    return Round(
        id=round_id,
        course=course_obj,
        date=date,
        tee_box=tee_box,
        intended_holes=tuple(intended) if intended is not None else None,
        hole_scores=[HoleScore(hole_number=n, **fields) for n, fields in sorted(scores.items())],
    )


def par_round(holes: Iterable[int] = FULL_ROUND, *, over: int = 0, course_obj: Optional[Course] = None,
              **round_kwargs) -> Round:
    """A round scoring par on every listed hole plus ``over`` strokes spread one per hole."""
    holes = list(holes)
    course_obj = course_obj if course_obj is not None else course(18 if len(holes) == 18 else 9)
    pars = {h.number: h.par for h in course_obj.holes}
    step = 1 if over >= 0 else -1
    extra = {n: 0 for n in holes}
    for i in range(abs(over)):
        extra[holes[i % len(holes)]] += step
    scores = {n: {"strokes": pars[n] + extra[n]} for n in holes}
    return round_(scores, course_obj=course_obj, **round_kwargs)
