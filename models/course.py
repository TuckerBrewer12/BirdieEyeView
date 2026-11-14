from pydantic import Field
from typing import List, Optional

from .base import BaseGolfModel
from .hole import BACK_NINE, FRONT_NINE, HOLES_PER_NINE, HOLES_PER_ROUND, Hole
from .tee import Tee


class Course(BaseGolfModel):
    id: Optional[str] = None
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    par: Optional[int] = Field(None, ge=27, le=80)
    holes: List[Hole] = Field(default_factory=list)
    tees: List[Tee] = Field(default_factory=list)
    user_id: Optional[str] = None

    def tees_by_length(self) -> List[Tee]:
        return sorted(self.tees, key=lambda t: (-(t.get_total_yardage() or 0), (t.color or "").lower()))

    def get_tee(self, color: Optional[str]) -> Optional[Tee]:
        if not color:
            return None
        for tee in self.tees:
            if tee.color and tee.color.lower() == color.lower():
                return tee
        return None

    def get_hole(self, number: int) -> Optional[Hole]:
        for hole in self.holes:
            if hole.number == number:
                return hole
        return None

    def get_par(self) -> Optional[int]:
        if self.par is not None:
            return self.par
        return self.calculated_par

    @property
    def calculated_par(self) -> Optional[int]:
        if len(self.holes) != HOLES_PER_ROUND or any(h.par is None for h in self.holes):
            return None
        return sum(h.par for h in self.holes if h.par is not None)

    @property
    def front_nine_par(self) -> Optional[int]:
        front = [h for h in self.holes if h.number in FRONT_NINE]
        if len(front) < HOLES_PER_NINE or any(h.par is None for h in front):
            return None
        return sum(h.par for h in front if h.par is not None)

    @property
    def back_nine_par(self) -> Optional[int]:
        back = [h for h in self.holes if h.number in BACK_NINE]
        if len(back) < HOLES_PER_NINE or any(h.par is None for h in back):
            return None
        return sum(h.par for h in back if h.par is not None)


class CourseSummary(BaseGolfModel):
    id: str
    name: Optional[str] = None
    external_course_id: Optional[str] = None
    location: Optional[str] = None
    par: Optional[int] = None
    hole_count: int = 0
    tee_count: int = 0
    tee_colors: List[str] = Field(default_factory=list)
