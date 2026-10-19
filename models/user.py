from datetime import datetime
from pydantic import Field, field_validator
from typing import List, Optional, TYPE_CHECKING

from .base import BaseGolfModel, CheckedList

if TYPE_CHECKING:
    from .round import Round

class User(BaseGolfModel):
    """Golfer with their rounds and handicap."""
    id: Optional[str] = None
    friend_code: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    home_course_id: Optional[str] = None
    handicap: Optional[float] = Field(None, strict=True, ge=-10, le=54)
    rounds: List["Round"] = Field(default_factory=list, validate_default=True)
    created_at: Optional[datetime] = None
    last_handicap_update: Optional[datetime] = None
    scoring_goal: Optional[int] = Field(None, strict=True, ge=18, le=270)
    scoring_goal_nine: Optional[int] = Field(None, strict=True, ge=9, le=135)

    @field_validator('rounds')
    @classmethod
    def check_rounds(cls, rounds):
        from .round import Round  # Imported lazily: round.py does not import user.py.
        return CheckedList(Round, rounds)
