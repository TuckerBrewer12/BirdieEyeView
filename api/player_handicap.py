"""The golfer's handicap index, read off their own rounds, for the figures that start from it."""

from typing import Optional

from analytics import handicap as hcap
from database.db_manager import DatabaseManager
from models import User


async def player_handicap_index(db: DatabaseManager, user: Optional[User]) -> Optional[float]:
    """The golfer's current index over their last 20 rounds, the WHS window, or None without one.
    Course handicaps and net scores on rounds, courses, scans and the net-score trend all use it,
    so every screen gives a round the same net score."""
    if user is None or user.id is None:
        return None
    rounds = await db.rounds.get_rounds_for_user(str(user.id), limit=20)
    return hcap.player_handicap_index(user, list(reversed(rounds)))
