"""The golfer's handicap index, read off their own rounds, for the figures that start from it."""

from typing import List, Optional, Tuple

from analytics import handicap as hcap
from database.db_manager import DatabaseManager
from models import Round, User

WHS_WINDOW = 20


async def player_handicap_index_with_rounds(
    db: DatabaseManager, user: Optional[User]
) -> Tuple[Optional[float], List[Round]]:
    """`player_handicap_index`, with the rounds it read (newest first), for a caller that also
    wants something off them, such as the day of the last one."""
    if user is None or user.id is None:
        return None, []
    rounds = await db.rounds.get_rounds_for_user(str(user.id), limit=WHS_WINDOW)
    return hcap.player_handicap_index(user, list(reversed(rounds))), rounds


async def player_handicap_index(db: DatabaseManager, user: Optional[User]) -> Optional[float]:
    """The golfer's current index over their last 20 rounds, the WHS window, or None without one.
    Course handicaps and net scores on rounds, courses, scans and the net-score trend all use it,
    so every screen gives a round the same net score."""
    index, _ = await player_handicap_index_with_rounds(db, user)
    return index
