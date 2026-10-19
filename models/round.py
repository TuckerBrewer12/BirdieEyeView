from datetime import datetime
from pydantic import Field, PrivateAttr, model_serializer, model_validator
from typing import Any, List, Optional, Union

from .base import BaseGolfModel
from .course import Course
from .hole_score import HoleScore
from .hole_layout import FRONT_NINE, BACK_NINE, FULL_ROUND, HoleCoverage
from .tee import Tee
from .user_tee import UserTee


class Round(BaseGolfModel):
    """Represents a round of golf played by a user."""
    id: Optional[str] = None
    course: Optional[Course] = None
    tee_box: Optional[str] = None
    date: Optional[datetime] = None
    hole_scores: List[HoleScore] = Field(default_factory=list)
    intended_holes: Optional[HoleCoverage] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    course_name_played: Optional[str] = None  # denormalized name when no master course
    user_tee: Optional[UserTee] = None        # user-owned tee config (yardages etc.)

    # Optional summary totals - can be provided directly or calculated
    total_putts: Optional[int] = Field(None, strict=True, ge=0, le=180)
    total_gir: Optional[int] = Field(None, strict=True, ge=0, le=18)
    _summary_sources: dict[str, Optional[tuple]] = PrivateAttr(default_factory=dict)

    @model_validator(mode='after')
    def check_intended_layout(self):
        layout = self.course.get_expected_holes() if self.course is not None else None
        if self.intended_holes is not None and layout is not None:
            if not set(self.intended_holes) <= set(layout):
                raise ValueError('Intended holes are outside the linked course layout')
        return self

    @model_validator(mode='after')
    def check_summary_bounds(self):
        coverage = self.get_intended_holes()
        count = len(coverage) if coverage is not None else 18
        if self.total_putts is not None and self.total_putts > count * 10:
            raise ValueError('Total putts exceeds intended hole coverage')
        if self.total_gir is not None and self.total_gir > count:
            raise ValueError('Total GIR exceeds intended hole coverage')
        return self

    def get_intended_holes(self) -> Optional[tuple[int, ...]]:
        if self.intended_holes is not None:
            return self.intended_holes
        if self.course is not None and self.course.total_holes == 9:
            return FRONT_NINE
        if self.course is not None and self.course.get_expected_holes() == FULL_ROUND:
            return FULL_ROUND
        numbers = [score.hole_number for score in self.hole_scores if score.hole_number is not None]
        if len(numbers) == 18 and set(numbers) == set(FULL_ROUND):
            return FULL_ROUND
        return None

    def _stat_fingerprint(self, field: str) -> tuple:
        relevant = ('hole_number', 'strokes', 'played', field)
        return self.get_intended_holes(), tuple(
            tuple((getattr(score, name), score._field_revisions.get(name, 0)) for name in relevant)
            for score in self.hole_scores
        )

    def model_post_init(self, context: Any) -> None:
        for field in ('putts', 'green_in_regulation'):
            self._summary_sources[field] = self._stat_fingerprint(field)

    @model_serializer(mode='wrap')
    def serialize_current_totals(self, handler):
        """Never persist a stale summary and accidentally make it fresh on reload."""
        data = handler(self)
        for field, value in (('total_putts', self.get_total_putts()), ('total_gir', self.get_total_gir())):
            if field in data:
                data[field] = value
        return data

    def _fields_updated(self, fields: set[str]) -> None:
        for summary, field in (('total_putts', 'putts'), ('total_gir', 'green_in_regulation')):
            if summary in fields:
                self._summary_sources[field] = self._stat_fingerprint(field)
            elif self._summary_sources.get(field) != self._stat_fingerprint(field):
                self._summary_sources[field] = None

    def _scored_holes(self, numbers=None) -> Optional[list[HoleScore]]:
        """Unique identified scores; duplicates or out-of-format scores are ambiguous."""
        selected = [s for s in self.hole_scores if s.hole_number is not None
                    and (numbers is None or s.hole_number in numbers)]
        identities = [s.hole_number for s in selected]
        if len(identities) != len(set(identities)):
            return None
        scored = [s for s in selected if s.strokes is not None and s.played is not False]
        intended = self.get_intended_holes()
        if intended is not None and any(s.hole_number not in intended for s in scored):
            return None
        return scored

    def update_hole_score(self, hole_number: int, **values: Any) -> Optional[str]:
        """Correct one uniquely identified child without an invalid intermediate state."""
        score = self.get_hole_score(hole_number)
        if score is None:
            return 'Hole score is missing or ambiguous'
        candidate = score.model_copy(deep=True)
        error = candidate.update_fields(**values)
        if error is not None:
            return error
        scores = [candidate if item is score else item for item in self.hole_scores]
        return self.update_field('hole_scores', scores)

    def get_tee(self) -> Optional[Union[Tee, UserTee]]:
        """Course tee first; user_tee only when the course has no tee with that name."""
        if self.course and self.tee_box:
            matches = self.course.get_tee_matches(self.tee_box)
            if len(matches) > 1:
                return None  # Ambiguous course tee: never substitute a custom tee.
            if matches:
                return matches[0]
        if self.user_tee is not None:
            return self.user_tee
        return None

    def get_total_putts(self) -> Optional[int]:
        return self._stat_total('putts', self.total_putts)

    def get_total_gir(self) -> Optional[int]:
        return self._stat_total('green_in_regulation', self.total_gir)

    def _stat_total(self, field: str, supplied: Optional[int]) -> Optional[int]:
        scored = self._scored_holes()
        if scored is None:
            return None
        observations = [getattr(s, field) for s in scored]
        if any(value is not None for value in observations):
            return sum(observations) if all(value is not None for value in observations) else None
        if self._summary_sources.get(field) == self._stat_fingerprint(field):
            return supplied
        return None

    def _stroke_total(self, numbers=None) -> Optional[int]:
        scored = self._scored_holes(numbers)
        return sum(s.strokes for s in scored) if scored else None

    def calculate_total_score(self) -> Optional[int]:
        """Calculate total strokes for the round."""
        return self._stroke_total()

    def calculate_front_nine(self) -> Optional[int]:
        """Calculate total strokes for holes 1-9."""
        return self._stroke_total(FRONT_NINE)

    def calculate_back_nine(self) -> Optional[int]:
        """Calculate total strokes for holes 10-18."""
        return self._stroke_total(BACK_NINE)

    def is_complete(self) -> bool:
        """Check if all holes have scores."""
        intended = self.get_intended_holes()
        scored = self._scored_holes()
        if intended is None or scored is None:
            return False
        if any(s.hole_number is None and s.strokes is not None for s in self.hole_scores):
            return False
        return {s.hole_number for s in scored} == set(intended)

    def get_hole_score(self, hole_number: int) -> Optional[HoleScore]:
        """Get score for a specific hole."""
        matches = [s for s in self.hole_scores if s.hole_number == hole_number]
        return matches[0] if len(matches) == 1 else None

    def get_hole_par(self, hole_number: int) -> Optional[int]:
        """Accepted historical par first, available course par as fallback."""
        matches = [s for s in self.hole_scores if s.hole_number == hole_number]
        if len(matches) > 1:
            return None
        score = self.get_hole_score(hole_number)
        if score is not None and score.par_played is not None:
            return score.par_played
        if self.course:
            hole = self.course.get_hole(hole_number)
            return hole.par if hole else None
        return None

    def get_par(self) -> Optional[int]:
        """Par of the entire intended set, never a partial known-par subtotal."""
        intended = self.get_intended_holes()
        if intended is None:
            return None
        if self._scored_holes() is None:
            return None
        pars = [self.get_hole_par(n) for n in intended]
        if all(par is not None for par in pars):
            return sum(pars)
        if self.course is not None and intended == self.course.get_expected_holes():
            if not any(s.par_played is not None for s in self.hole_scores):
                return self.course.get_par()
        return None

    def score_to_par(self, hole_number: int) -> Optional[int]:
        """Get score relative to par for a specific hole."""
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.to_par(par)
        return None

    def get_score_type(self, hole_number: int) -> Optional[str]:
        """Get score name (eagle, birdie, par, bogey, etc.) for a hole."""
        score = self.get_hole_score(hole_number)
        par = self.get_hole_par(hole_number)
        if score and par:
            return score.get_score_type(par)
        return None

    def total_to_par(self) -> Optional[int]:
        """Compare strokes and par for exactly the same identified scored holes."""
        scored = self._scored_holes()
        if not scored:
            return None
        pars = [self.get_hole_par(s.hole_number) for s in scored]
        if any(par is None for par in pars):
            return None
        return sum(s.strokes for s in scored) - sum(pars)

    def calculate_net_score(self, course_handicap: Optional[int] = None) -> Optional[int]:
        """Net round strokes require complete gross and an applicable Course Handicap."""
        if course_handicap is not None and type(course_handicap) is not int:
            raise ValueError('Course Handicap must be an integer')
        if course_handicap is None or not self.is_complete():
            return None
        return self.calculate_total_score() - course_handicap
