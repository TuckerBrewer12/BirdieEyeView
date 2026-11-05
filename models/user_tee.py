from datetime import datetime
from typing import Optional

from .tee import TeeData


class UserTee(TeeData):
    """A user-owned tee configuration, optionally linked to a master course."""
    id: Optional[str] = None
    user_id: str
    course_id: Optional[str] = None
    name: str
    created_at: Optional[datetime] = None
