from pydantic import Field, TypeAdapter, model_validator
from typing import Annotated, Any, Literal, Optional

from .base import BaseGolfModel
from .scoring import classify_score

_PAR = TypeAdapter(Annotated[int, Field(strict=True, ge=3, le=6)])
_ALLOCATION = TypeAdapter(Annotated[int, Field(strict=True, ge=-(2**31), le=2**31 - 1)])


ScoreKind = Literal["eagle", "birdie", "par", "bogey", "double", "triple", "quad"]

class HoleScore(BaseGolfModel):
    hole_number: Optional[int] = Field(None, strict=True, ge=1, le=18)
    strokes: Optional[int] = Field(None, strict=True, ge=1, le=15)
    net_score: Optional[int] = Field(None, strict=True, ge=-(2**31), le=2**31 - 1)
    played: Optional[bool] = None
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

    def with_edits(self, **changes: Any) -> "HoleScore":
        values = self.model_dump()
        strokes = changes.get("strokes")
        if isinstance(strokes, int):
            if "played" not in changes and self.played is False:
                values["played"] = True
            if "shots_to_green" not in changes and self.shots_to_green is not None and self.shots_to_green > strokes:
                values["shots_to_green"] = None
        return type(self)(**{**values, **changes})

    def calculate_net_score(self, handicap_strokes: Optional[int] = None) -> Optional[int]:
        allocation = _ALLOCATION.validate_python(handicap_strokes) if handicap_strokes is not None else None
        if self.strokes is None or allocation is None:
            return None
        return _ALLOCATION.validate_python(self.strokes - allocation)

    def to_par(self, par: Optional[int] = None) -> Optional[int]:
        effective_par = _PAR.validate_python(par) if par is not None else self.par_played
        if self.strokes is None or effective_par is None:
            return None
        return self.strokes - effective_par

    def get_score_type(self, par: Optional[int] = None) -> Optional[str]:
        relative = self.to_par(par)
        if relative is None:
            return None

        return classify_score(relative)

    def is_three_putt(self) -> bool:
        return self.putts is not None and self.putts >= 3


def score_kind(to_par: Optional[int]) -> Optional[ScoreKind]:
    if to_par is None:
        return None
    if to_par <= -2:
        return "eagle"
    if to_par >= 4:
        return "quad"
    return {-1: "birdie", 0: "par", 1: "bogey", 2: "double", 3: "triple"}[to_par]
