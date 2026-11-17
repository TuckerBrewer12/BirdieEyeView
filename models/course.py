from pydantic import Field, PrivateAttr, model_serializer, model_validator
from typing import Annotated, Any, List, Literal, Optional

from .base import BaseGolfModel, checked_list
from .hole import HOLES_PER_NINE, HOLES_PER_ROUND, Hole
from .hole_layout import FRONT_NINE, BACK_NINE, FULL_ROUND
from .tee import Tee


class Course(BaseGolfModel):
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    total_holes: Optional[Literal[9, 18]] = None
    par: Optional[int] = Field(None, strict=True, ge=27, le=108)
    holes: Annotated[List[Hole], checked_list(Hole)] = Field(default_factory=list, validate_default=True)
    tees: Annotated[List[Tee], checked_list(Tee)] = Field(default_factory=list, validate_default=True)
    user_id: Optional[str] = None
    _par_source: Optional[tuple] = PrivateAttr(default=None)

    @model_validator(mode='after')
    def check_par_bounds(self):
        if self.par is not None and self.total_holes is not None:
            if not 3 * self.total_holes <= self.par <= 6 * self.total_holes:
                raise ValueError('Course par must match its declared hole coverage')
        return self

    def _par_fingerprint(self) -> tuple:
        return self.total_holes, tuple((h.number, h.par, h.revision) for h in self.holes)

    def model_post_init(self, _context: Any) -> None:
        self._par_source = self._par_fingerprint()

    @model_serializer(mode='wrap')
    def serialize_current_par(self, handler):
        data = handler(self)
        if 'par' in data:
            data['par'] = self.get_par()
        return data

    def _fields_updated(self, fields: set[str]) -> None:
        if 'par' in fields:
            self._par_source = self._par_fingerprint()
        elif fields & {'holes', 'total_holes'}:
            self._par_source = None

    def get_expected_holes(self) -> Optional[tuple[int, ...]]:
        if self.total_holes == HOLES_PER_NINE:
            return FRONT_NINE
        if self.total_holes == HOLES_PER_ROUND:
            return FULL_ROUND
        numbers = [h.number for h in self.holes]
        if len(numbers) == HOLES_PER_ROUND and set(numbers) == set(FULL_ROUND):
            return FULL_ROUND
        return None

    def get_tee_matches(self, color: Optional[str]) -> list[Tee]:
        if not color:
            return []
        return [tee for tee in self.tees if tee.color and tee.color.casefold() == color.casefold()]

    def get_tee(self, color: Optional[str]) -> Optional[Tee]:
        matches = self.get_tee_matches(color)
        return matches[0] if len(matches) == 1 else None

    def get_hole(self, number: int) -> Optional[Hole]:
        matches = [hole for hole in self.holes if hole.number == number]
        return matches[0] if len(matches) == 1 else None

    @property
    def par_from_holes(self) -> bool:
        return any(h.par is not None for h in self.holes)

    def get_par(self) -> Optional[int]:
        if self.par_from_holes:
            return self.calculated_par
        if self._par_source == self._par_fingerprint():
            return self.par
        return None

    def _par_for(self, numbers: tuple[int, ...]) -> Optional[int]:
        holes = [self.get_hole(n) for n in numbers]
        if any(hole is None or hole.par is None for hole in holes):
            return None
        return sum(hole.par for hole in holes)

    @property
    def calculated_par(self) -> Optional[int]:
        expected = self.get_expected_holes()
        if expected is None or len(self.holes) != len(expected):
            return None
        return self._par_for(expected)

    @property
    def front_nine_par(self) -> Optional[int]:
        return self._par_for(FRONT_NINE)

    @property
    def back_nine_par(self) -> Optional[int]:
        return self._par_for(BACK_NINE)

    def has_required_course_data(self, selected_tee: Optional[str] = None) -> bool:
        expected = self.get_expected_holes()
        if not self.name or not self.name.strip() or expected is None or self.calculated_par is None:
            return False

        def complete(tee: Tee) -> bool:
            return (bool(tee.color and tee.color.strip()) and self.get_tee(tee.color) is tee
                    and all(n in tee.hole_yardages for n in expected))

        if not any(complete(tee) for tee in self.tees):
            return False
        if selected_tee is not None:
            tee = self.get_tee(selected_tee)
            return tee is not None and complete(tee)
        return True

    def tees_by_length(self) -> List[Tee]:
        return sorted(self.tees, key=lambda t: (-(t.get_total_yardage() or 0), (t.color or "").lower()))


class CourseSummary(BaseGolfModel):
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    par: Optional[int] = None
    hole_count: int = 0
    tee_count: int = 0
    tee_colors: List[str] = Field(default_factory=list)
