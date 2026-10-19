from pydantic import Field, PrivateAttr, model_serializer, model_validator
from typing import Annotated, Any, List, Literal, Optional

from .base import BaseGolfModel, checked_list
from .hole import Hole
from .hole_layout import FRONT_NINE, BACK_NINE, FULL_ROUND
from .tee import Tee


class Course(BaseGolfModel):
    """Represents a golf course with its holes and tee options.

    user_id IS None  => master/global course (read-only for regular users)
    user_id IS set   => custom course owned by that user
    """
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    total_holes: Optional[Literal[9, 18]] = None
    par: Optional[int] = Field(None, strict=True, ge=27, le=108)
    holes: Annotated[List[Hole], checked_list(Hole)] = Field(default_factory=list, validate_default=True)
    tees: Annotated[List[Tee], checked_list(Tee)] = Field(default_factory=list, validate_default=True)
    user_id: Optional[str] = None  # None = master course; set = user-owned custom course
    _par_source: Optional[tuple] = PrivateAttr(default=None)

    @model_validator(mode='after')
    def check_par_bounds(self):
        if self.par is not None and self.total_holes is not None:
            if not 3 * self.total_holes <= self.par <= 6 * self.total_holes:
                raise ValueError('Course par must match its declared hole coverage')
        return self

    def _par_fingerprint(self) -> tuple:
        return self.total_holes, tuple((h.number, h.par, h._revision) for h in self.holes)

    def model_post_init(self, context: Any) -> None:
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
        if self.total_holes == 9:
            return FRONT_NINE
        if self.total_holes == 18:
            return FULL_ROUND
        numbers = [h.number for h in self.holes]
        if len(numbers) == 18 and set(numbers) == set(FULL_ROUND):
            return FULL_ROUND
        return None

    def get_tee_matches(self, color: Optional[str]) -> list[Tee]:
        """All tees whose color matches case-insensitively; more than one is ambiguous."""
        if not color:
            return []
        return [tee for tee in self.tees if tee.color and tee.color.casefold() == color.casefold()]

    def get_tee(self, color: Optional[str]) -> Optional[Tee]:
        """Get a tee by its color."""
        matches = self.get_tee_matches(color)
        return matches[0] if len(matches) == 1 else None

    def get_hole(self, number: int) -> Optional[Hole]:
        """Get a hole by its number (1-18)."""
        matches = [hole for hole in self.holes if hole.number == number]
        return matches[0] if len(matches) == 1 else None

    def get_par(self) -> Optional[int]:
        """Child observations are authoritative; partial par is not a full total."""
        if any(h.par is not None for h in self.holes):
            return self.calculated_par
        # A supplied whole-course summary does not itself establish a 9/18 layout.
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
        """Calculate total par from holes."""
        expected = self.get_expected_holes()
        if expected is None or len(self.holes) != len(expected):
            return None
        return self._par_for(expected)

    @property
    def front_nine_par(self) -> Optional[int]:
        """Calculate par for holes 1-9."""
        return self._par_for(FRONT_NINE)

    @property
    def back_nine_par(self) -> Optional[int]:
        """Calculate par for holes 10-18."""
        return self._par_for(BACK_NINE)

    def has_required_course_data(self, selected_tee: Optional[str] = None) -> bool:
        """Structural save prerequisite only; does NOT verify identity/source trust."""
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
