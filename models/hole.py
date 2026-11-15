from pydantic import Field
from typing import Optional

from .base import BaseGolfModel


HOLES_PER_NINE = 9
HOLES_PER_ROUND = 18
FRONT_NINE = range(1, HOLES_PER_NINE + 1)
BACK_NINE = range(HOLES_PER_NINE + 1, HOLES_PER_ROUND + 1)

class Hole(BaseGolfModel):
    number: Optional[int] = Field(None, strict=True, ge=1, le=18)
    par: Optional[int] = Field(None, strict=True, ge=3, le=6)
    handicap: Optional[int] = Field(None, strict=True, ge=1, le=18)
