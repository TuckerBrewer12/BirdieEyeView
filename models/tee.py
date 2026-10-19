from typing import Annotated, Any, Dict, Optional

from pydantic import Field, PrivateAttr, field_validator, model_serializer, model_validator

from .base import BaseGolfModel, checked_list
from .hole_layout import FULL_ROUND, HoleCoverage, validate_coverage

CourseRating = Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]
SlopeRating = Annotated[float, Field(strict=True, ge=55, le=155, allow_inf_nan=False)]


class ReadOnlyYardages(dict):
    """Dictionary-compatible serialization without unchecked in-place edits."""

    def _reject(self, *args, **kwargs):
        raise TypeError('Replace yardages with update_yardages() or validated assignment')

    __setitem__ = __delitem__ = clear = pop = popitem = setdefault = update = __ior__ = _reject

    def __deepcopy__(self, memo):
        return self  # Both keys and values are immutable integers.

    def __reduce__(self):
        # copy/pickle would otherwise rebuild through the rejected __setitem__.
        return type(self), (dict(self),)


def validate_yardages(value) -> dict[int, int]:
    if not isinstance(value, dict):
        raise ValueError('Yardages must be a dictionary')
    result = {}
    for key, yardage in value.items():
        if type(key) is int:
            number = key
        elif isinstance(key, str) and key.isascii() and key.isdigit():
            number = int(key)
        else:
            raise ValueError('Hole numbers must be integers from 1 to 18')
        if not 1 <= number <= 18:
            raise ValueError('Hole numbers must be integers from 1 to 18')
        if number in result:
            raise ValueError(f'Duplicate normalized hole number: {number}')
        if type(yardage) is not int or not 0 <= yardage <= 1000:
            raise ValueError('Yardages must be integers from 0 to 1,000; omit unknown entries')
        result[number] = yardage
    return result


class TeeRating(BaseGolfModel):
    """A published rating for exactly the declared holes, never an inferred half."""
    hole_numbers: HoleCoverage
    course_rating: Optional[CourseRating] = None
    slope_rating: Optional[SlopeRating] = None


class TeeData(BaseGolfModel):
    """Shared yardage/rating rules for course tees and user-owned tees."""
    total_yardage: Optional[int] = Field(None, strict=True, ge=0, le=18000)
    hole_yardages: Dict[int, int] = Field(default_factory=ReadOnlyYardages)
    yardage_holes: Optional[HoleCoverage] = None
    course_rating: Optional[CourseRating] = None
    slope_rating: Optional[SlopeRating] = None
    rating_holes: Optional[HoleCoverage] = None
    ratings: Annotated[list[TeeRating], checked_list(TeeRating)] = Field(default_factory=list, validate_default=True)
    _total_source: Optional[tuple] = PrivateAttr(default=None)

    @field_validator('hole_yardages', mode='before')
    @classmethod
    def check_yardages(cls, value):
        return validate_yardages(value)

    @field_validator('hole_yardages')
    @classmethod
    def protect_yardages(cls, value):
        return ReadOnlyYardages(value)

    @model_validator(mode='after')
    def check_total_bounds(self):
        if self.total_yardage is not None and self.yardage_holes is not None:
            if self.total_yardage > 1000 * len(self.yardage_holes):
                raise ValueError('Total yardage exceeds the declared hole coverage')
        return self

    def _yardage_fingerprint(self) -> tuple:
        return self.yardage_holes, tuple(sorted(self.hole_yardages.items()))

    def model_post_init(self, context: Any) -> None:
        self._total_source = self._yardage_fingerprint()

    @model_serializer(mode='wrap')
    def serialize_current_total(self, handler):
        data = handler(self)
        if 'total_yardage' in data:
            data['total_yardage'] = self.get_total_yardage()
        return data

    def _fields_updated(self, fields: set[str]) -> None:
        if 'total_yardage' in fields:
            self._total_source = self._yardage_fingerprint()
        elif fields & {'hole_yardages', 'yardage_holes'}:
            self._total_source = None

    def update_yardages(self, yardages: dict[int, int]) -> Optional[str]:
        """Validate and replace the entire mapping; unknown holes are omitted."""
        return self.update_field('hole_yardages', yardages)

    def get_hole_yardage(self, hole_number: int) -> Optional[int]:
        return self.hole_yardages.get(hole_number)

    def get_total_yardage(self, hole_numbers=None) -> Optional[int]:
        requested = validate_coverage(hole_numbers) if hole_numbers is not None else None
        coverage = requested or self.yardage_holes
        if coverage is None and set(self.hole_yardages) == set(FULL_ROUND):
            coverage = FULL_ROUND
        if self.hole_yardages:
            if coverage is None or not all(n in self.hole_yardages for n in coverage):
                return None
            return sum(self.hole_yardages[n] for n in coverage)
        if requested is not None and requested != self.yardage_holes:
            return None
        if self._total_source == self._yardage_fingerprint():
            return self.total_yardage
        return None

    def get_rating(self, hole_numbers) -> Optional[TeeRating]:
        """Only return explicitly matching coverage, including for legacy scalars."""
        coverage = validate_coverage(hole_numbers)
        matches = [rating for rating in self.ratings if rating.hole_numbers == coverage]
        if matches:
            return matches[0] if len(matches) == 1 else None
        if self.rating_holes == coverage and (self.course_rating is not None or self.slope_rating is not None):
            return TeeRating(hole_numbers=coverage, course_rating=self.course_rating, slope_rating=self.slope_rating)
        return None


class Tee(TeeData):
    """Represents a tee box option with its ratings and hole yardages."""
    color: Optional[str] = None
