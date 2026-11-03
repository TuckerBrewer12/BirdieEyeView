from datetime import datetime
from pydantic import Field
from typing import Dict, List, Optional, Union

from .base import BaseGolfModel
from .course import Course
from .hole_score import HoleScore, ScoreKind, score_kind
from .tee import Tee
from .user_tee import UserTee


def _sum_if_complete(values: List[Optional[int]]) -> Optional[int]:
    known = [v for v in values if v is not None]
    return sum(known) if len(known) == len(values) else None


class Round(BaseGolfModel):
    id: Optional[str] = None
    course: Optional[Course] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    hole_scores: List[HoleScore] = Field(default_factory=list)
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None
    user_tee: Optional[UserTee] = None

    total_putts: Optional[int] = None
    total_gir: Optional[int] = None

    def get_tee(self) -> Optional[Union[Tee, UserTee]]:
        if self.course and self.tee_box:
            tee = self.course.get_tee(self.tee_box)
            if tee is not None:
                return tee
        if self.user_tee is not None:
            return self.user_tee
        return None

    def get_total_putts(self) -> Optional[int]:
        if self.total_putts is not None:
            return self.total_putts
        scored = [s for s in self.hole_scores if s.strokes is not None]
        if not scored:
            return None
        return _sum_if_complete([s.putts for s in scored])

    def get_total_gir(self) -> Optional[int]:
        if self.total_gir is not None:
            return self.total_gir
        girs = [s.green_in_regulation for s in self.hole_scores
                if s.green_in_regulation is not None]
        return sum(girs) if girs else None

    def calculate_total_score(self) -> Optional[int]:
        strokes = [s.strokes for s in self.hole_scores if s.strokes is not None]
        return sum(strokes) if strokes else None

    def _nine_total(self, first: int, last: int) -> Optional[int]:
        strokes = [
            s.strokes for s in self.hole_scores
            if s.hole_number is not None and first <= s.hole_number <= last and s.strokes is not None
        ]
        return sum(strokes) if len(strokes) == 9 else None

    def _scores_on(self, first: int, last: int) -> List[HoleScore]:
        return [s for s in self.hole_scores if s.hole_number is not None and first <= s.hole_number <= last]

    def nine_par(self, first: int, last: int) -> Optional[int]:
        pars = [self.get_hole_par(n) for n in range(first, last + 1)]
        return _sum_if_complete(pars)

    def nine_to_par(self, first: int, last: int) -> Optional[int]:
        strokes = self._nine_total(first, last)
        par = self.nine_par(first, last)
        return strokes - par if strokes is not None and par is not None else None

    def nine_putts(self, first: int, last: int) -> Optional[int]:
        scored = [s for s in self._scores_on(first, last) if s.strokes is not None]
        if not scored:
            return None
        return _sum_if_complete([s.putts for s in scored])

    def nine_gir(self, first: int, last: int) -> Optional[int]:
        girs = [s.green_in_regulation for s in self._scores_on(first, last) if s.green_in_regulation is not None]
        return sum(girs) if girs else None

    def nine_yardage(self, first: int, last: int) -> Optional[int]:
        yards = [self.get_hole_yardage(n) for n in range(first, last + 1)]
        return _sum_if_complete(yards)

    def calculate_front_nine(self) -> Optional[int]:
        return self._nine_total(1, 9)

    def calculate_back_nine(self) -> Optional[int]:
        return self._nine_total(10, 18)

    def get_fairways_hit(self) -> Optional[int]:
        fairways = [s.fairway_hit for s in self.hole_scores if s.fairway_hit is not None]
        return sum(fairways) if fairways else None

    def is_complete(self) -> bool:
        if not self.hole_scores:
            return False
        expected = 18 if len(self.hole_scores) > 9 else 9
        valid_scores = [s for s in self.hole_scores if s.strokes is not None]
        return len(valid_scores) == expected

    def get_hole_score(self, hole_number: int) -> Optional[HoleScore]:
        return next((s for s in self.hole_scores if s.hole_number == hole_number), None)

    def get_hole_par(self, hole_number: int) -> Optional[int]:
        if self.course:
            hole = self.course.get_hole(hole_number)
            if hole and hole.par is not None:
                return hole.par
        score = self.get_hole_score(hole_number)
        return score.par_played if score else None

    def get_hole_handicap(self, hole_number: int) -> Optional[int]:
        if self.course:
            hole = self.course.get_hole(hole_number)
            if hole and hole.handicap is not None:
                return hole.handicap
        score = self.get_hole_score(hole_number)
        return score.handicap_played if score else None

    def get_hole_yardage(self, hole_number: int) -> Optional[int]:
        tee = self.get_tee()
        return tee.hole_yardages.get(hole_number) if tee else None

    def get_total_yardage(self) -> Optional[int]:
        tee = self.get_tee()
        if isinstance(tee, Tee):
            return tee.get_total_yardage()
        if tee and tee.hole_yardages:
            return sum(tee.hole_yardages.values())
        return None

    def get_par(self) -> Optional[int]:
        if self.course:
            return self.course.get_par()
        pars = [hs.par_played for hs in self.hole_scores if hs.par_played is not None]
        return sum(pars) if pars else None

    def score_to_par(self, hole_number: int) -> Optional[int]:
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.to_par(par)
        return None

    def get_score_kind(self, hole_number: int) -> Optional[ScoreKind]:
        return score_kind(self.score_to_par(hole_number))

    def get_score_counts(self) -> Dict[ScoreKind, int]:
        counts: Dict[ScoreKind, int] = {}
        for s in self.hole_scores:
            kind = self.get_score_kind(s.hole_number) if s.hole_number is not None else None
            if kind is not None:
                counts[kind] = counts.get(kind, 0) + 1
        return counts

    def get_score_type(self, hole_number: int) -> Optional[str]:
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.get_score_type(par)
        return None

    def total_to_par(self) -> Optional[int]:
        total = self.calculate_total_score()
        if total is None:
            return None
        course_par = self.get_par()
        if course_par is None:
            return None
        return total - course_par