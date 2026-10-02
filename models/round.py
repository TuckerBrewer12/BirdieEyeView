from datetime import datetime
from pydantic import Field
from typing import Dict, List, Optional, Union

from .base import BaseGolfModel
from .course import Course
from .hole_score import HoleScore, ScoreKind, score_kind
from .tee import Tee
from .user_tee import UserTee


class Round(BaseGolfModel):
    """Represents a round of golf played by a user."""
    id: Optional[str] = None
    course: Optional[Course] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    hole_scores: List[HoleScore] = Field(default_factory=list)
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None  # denormalized name when no master course
    user_tee: Optional[UserTee] = None        # user-owned tee config (yardages etc.)

    # Optional summary totals - can be provided directly or calculated
    total_putts: Optional[int] = None
    total_gir: Optional[int] = None

    def get_tee(self) -> Optional[Union[Tee, UserTee]]:
        """Get the tee used for this round — course tee first, user_tee as fallback."""
        if self.course and self.tee_box:
            tee = self.course.get_tee(self.tee_box)
            if tee is not None:
                return tee
        if self.user_tee is not None:
            return self.user_tee
        return None

    def get_total_putts(self) -> Optional[int]:
        """Get total putts - uses provided value or calculates from holes.
        Returns None if any scored hole is missing putts (partial sums are misleading)."""
        if self.total_putts is not None:
            return self.total_putts
        scored = [s for s in self.hole_scores if s.strokes is not None]
        if not scored or any(s.putts is None for s in scored):
            return None
        return sum(s.putts for s in scored)  # type: ignore[misc]

    def get_total_gir(self) -> Optional[int]:
        """Get total GIR - uses provided value or calculates from holes."""
        if self.total_gir is not None:
            return self.total_gir
        girs = [s.green_in_regulation for s in self.hole_scores
                if s.green_in_regulation is not None]
        return sum(girs) if girs else None

    def calculate_total_score(self) -> Optional[int]:
        """Calculate total strokes for the round."""
        strokes = [s.strokes for s in self.hole_scores if s.strokes is not None]
        return sum(strokes) if strokes else None

    def _nine_total(self, first: int, last: int) -> Optional[int]:
        """A nine's strokes, once all nine of its holes are scored."""
        strokes = [
            s.strokes for s in self.hole_scores
            if s.hole_number is not None and first <= s.hole_number <= last and s.strokes is not None
        ]
        return sum(strokes) if len(strokes) == 9 else None

    def _scores_on(self, first: int, last: int) -> List[HoleScore]:
        return [s for s in self.hole_scores if s.hole_number is not None and first <= s.hole_number <= last]

    def nine_par(self, first: int, last: int) -> Optional[int]:
        """A nine's par, once every one of its holes has one."""
        pars = [self.get_hole_par(n) for n in range(first, last + 1)]
        return None if any(p is None for p in pars) else sum(pars)  # type: ignore[arg-type]

    def nine_to_par(self, first: int, last: int) -> Optional[int]:
        """A nine's strokes against its par, once both are known."""
        strokes = self._nine_total(first, last)
        par = self.nine_par(first, last)
        return strokes - par if strokes is not None and par is not None else None

    def nine_putts(self, first: int, last: int) -> Optional[int]:
        """A nine's putts. None if any scored hole is missing putts, as for the round."""
        scored = [s for s in self._scores_on(first, last) if s.strokes is not None]
        if not scored or any(s.putts is None for s in scored):
            return None
        return sum(s.putts for s in scored)  # type: ignore[misc]

    def nine_gir(self, first: int, last: int) -> Optional[int]:
        """Greens hit on a nine, across the holes that recorded it."""
        girs = [s.green_in_regulation for s in self._scores_on(first, last) if s.green_in_regulation is not None]
        return sum(girs) if girs else None

    def nine_yardage(self, first: int, last: int) -> Optional[int]:
        """A nine's length from the tee played, once every hole has a yardage."""
        yards = [self.get_hole_yardage(n) for n in range(first, last + 1)]
        return None if any(y is None for y in yards) else sum(yards)  # type: ignore[arg-type]

    def calculate_front_nine(self) -> Optional[int]:
        """Total strokes for holes 1-9, once all nine are scored."""
        return self._nine_total(1, 9)

    def calculate_back_nine(self) -> Optional[int]:
        """Total strokes for holes 10-18, once all nine are scored."""
        return self._nine_total(10, 18)

    def get_fairways_hit(self) -> Optional[int]:
        """Fairways hit across the holes that recorded it."""
        fairways = [s.fairway_hit for s in self.hole_scores if s.fairway_hit is not None]
        return sum(fairways) if fairways else None

    def is_complete(self) -> bool:
        """Check if all holes have scores."""
        if not self.hole_scores:
            return False
        expected = 18 if len(self.hole_scores) > 9 else 9
        valid_scores = [s for s in self.hole_scores if s.strokes is not None]
        return len(valid_scores) == expected

    def get_hole_score(self, hole_number: int) -> Optional[HoleScore]:
        """Get score for a specific hole."""
        return next((s for s in self.hole_scores if s.hole_number == hole_number), None)

    def get_hole_par(self, hole_number: int) -> Optional[int]:
        """Get par for a specific hole — the course's hole, else par_played on the hole score."""
        if self.course:
            hole = self.course.get_hole(hole_number)
            if hole and hole.par is not None:
                return hole.par
        score = self.get_hole_score(hole_number)
        return score.par_played if score else None

    def get_hole_handicap(self, hole_number: int) -> Optional[int]:
        """Stroke index for a hole — the course's hole, else handicap_played on the hole score."""
        if self.course:
            hole = self.course.get_hole(hole_number)
            if hole and hole.handicap is not None:
                return hole.handicap
        score = self.get_hole_score(hole_number)
        return score.handicap_played if score else None

    def get_hole_yardage(self, hole_number: int) -> Optional[int]:
        """Yardage for a hole from the tee played."""
        tee = self.get_tee()
        return tee.hole_yardages.get(hole_number) if tee else None

    def get_total_yardage(self) -> Optional[int]:
        """The tee played's length: its stated total, else its hole yardages added up."""
        tee = self.get_tee()
        if isinstance(tee, Tee):
            return tee.get_total_yardage()
        if tee and tee.hole_yardages:
            return sum(tee.hole_yardages.values())
        return None

    def get_par(self) -> Optional[int]:
        """Get course par — from course, or calculated from par_played on hole scores."""
        if self.course:
            return self.course.get_par()
        pars = [hs.par_played for hs in self.hole_scores if hs.par_played is not None]
        return sum(pars) if pars else None

    def score_to_par(self, hole_number: int) -> Optional[int]:
        """Get score relative to par for a specific hole."""
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.to_par(par)
        return None

    def get_score_kind(self, hole_number: int) -> Optional[ScoreKind]:
        """Which of the app's seven score buckets a hole landed in."""
        return score_kind(self.score_to_par(hole_number))

    def get_score_counts(self) -> Dict[ScoreKind, int]:
        """How many holes landed in each score bucket. Holes that cannot be classified are left out."""
        counts: Dict[ScoreKind, int] = {}
        for s in self.hole_scores:
            kind = self.get_score_kind(s.hole_number) if s.hole_number is not None else None
            if kind is not None:
                counts[kind] = counts.get(kind, 0) + 1
        return counts

    def get_score_type(self, hole_number: int) -> Optional[str]:
        """Get score name (eagle, birdie, par, bogey, etc.) for a hole."""
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.get_score_type(par)
        return None

    def total_to_par(self) -> Optional[int]:
        """Get total score relative to course par (uses par_played when no course attached)."""
        total = self.calculate_total_score()
        if total is None:
            return None
        course_par = self.get_par()
        if course_par is None:
            return None
        return total - course_par