from pydantic import Field, field_validator
from typing import Dict, Optional

from .base import BaseGolfModel
from .hole import HOLES_PER_ROUND


class Tee(BaseGolfModel):
    color: Optional[str] = None
    total_yardage: Optional[int] = Field(None, ge=0)
    hole_yardages: Dict[int, int] = Field(default_factory=dict)
    slope_rating: Optional[float] = Field(None, ge=55, le=155)
    course_rating: Optional[float] = Field(None, ge=55.0, le=85.0)

    @field_validator('hole_yardages')
    @classmethod
    def validate_hole_yardages(cls, v):
        for hole_num, yardage in v.items():
            if not 1 <= hole_num <= HOLES_PER_ROUND:
                raise ValueError(f"Hole number {hole_num} must be 1-{HOLES_PER_ROUND}")
            if yardage < 0:
                raise ValueError(f"Yardage for hole {hole_num} cannot be negative")
            if yardage > 700:
                raise ValueError(f"Yardage {yardage} for hole {hole_num} seems too high")
        return v

    def get_hole_yardage(self, hole_number: int) -> Optional[int]:
        return self.hole_yardages.get(hole_number)

    def get_total_yardage(self) -> Optional[int]:
        if self.total_yardage is not None:
            return self.total_yardage
        if not self.hole_yardages:
            return None
        return sum(self.hole_yardages.values())

    def _nine_yardage(self, first: int) -> Optional[int]:
        yards = [self.hole_yardages.get(n) for n in range(first, first + 9)]
        if any(y is None for y in yards):
            return None
        return sum(yards)

    @property
    def front_nine_yardage(self) -> Optional[int]:
        return self._nine_yardage(1)

    @property
    def back_nine_yardage(self) -> Optional[int]:
        return self._nine_yardage(10)