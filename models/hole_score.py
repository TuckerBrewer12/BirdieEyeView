from pydantic import Field, TypeAdapter, model_validator
from typing import Annotated, Optional

from .base import BaseGolfModel
from .scoring import classify_score

_PAR = TypeAdapter(Annotated[int, Field(strict=True, ge=3, le=6)])
_ALLOCATION = TypeAdapter(Annotated[int, Field(strict=True, ge=-(2**31), le=2**31 - 1)])


class HoleScore(BaseGolfModel):
    """Represents a player's score on a single hole (raw scanned data)."""
    hole_number: Optional[int] = Field(None, strict=True, ge=1, le=18)
    strokes: Optional[int] = Field(None, strict=True, ge=1, le=15)
    # Net strokes, not to-par: gross minus the handicap allocated to this hole.
    net_score: Optional[int] = Field(None, strict=True, ge=-(2**31), le=2**31 - 1)
    played: Optional[bool] = None  # False = deliberately unplayed; None = unknown
    putts: Optional[int] = Field(None, strict=True, ge=0, le=10)
    shots_to_green: Optional[int] = Field(None, strict=True, ge=1, le=10)
    fairway_hit: Optional[bool] = None
    green_in_regulation: Optional[bool] = None
    par_played: Optional[int] = Field(None, strict=True, ge=3, le=6)
    handicap_played: Optional[int] = Field(None, strict=True, ge=1, le=18)

    @model_validator(mode='after')
    def validate_score_consistency(self):
        if self.played is False and self.strokes is not None:
            raise ValueError('An unplayed hole cannot have strokes')
        if self.putts is not None and self.strokes is not None:
            if self.putts > self.strokes:
                raise ValueError(f"Putts ({self.putts}) cannot exceed strokes ({self.strokes})")
        if self.shots_to_green is not None and self.strokes is not None:
            if self.shots_to_green > self.strokes:
                raise ValueError('Shots to green cannot exceed strokes')
        return self

    def calculate_net_score(self, handicap_strokes: Optional[int] = None) -> Optional[int]:
        """Requires this hole's allocation, not a Handicap Index or round handicap."""
        allocation = _ALLOCATION.validate_python(handicap_strokes) if handicap_strokes is not None else None
        if self.strokes is None or allocation is None:
            return None
        return _ALLOCATION.validate_python(self.strokes - allocation)

    def to_par(self, par: Optional[int] = None) -> Optional[int]:
        """Calculate score relative to par. Falls back to par_played if par not passed."""
        effective_par = _PAR.validate_python(par) if par is not None else self.par_played
        if self.strokes is None or effective_par is None:
            return None
        return self.strokes - effective_par

    def get_score_type(self, par: Optional[int] = None) -> Optional[str]:
        """Get score name (eagle, birdie, par, bogey, etc.). Falls back to par_played."""
        relative = self.to_par(par)
        if relative is None:
            return None

        return classify_score(relative)
