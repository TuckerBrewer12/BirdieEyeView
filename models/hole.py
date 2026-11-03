from pydantic import Field
from typing import Optional

from .base import BaseGolfModel


class Hole(BaseGolfModel):
    number: Optional[int] = Field(None, ge=1, le=18)
    par: Optional[int] = Field(None, ge=3, le=6)
    handicap: Optional[int] = Field(None, ge=1, le=18)