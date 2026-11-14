from typing import List, Optional, Tuple

from analytics import handicap as hcap
from database.db_manager import DatabaseManager
from models import Round, User

WHS_WINDOW = 20


async def player_handicap_index_with_rounds(
    db: DatabaseManager, user: Optional[User]
) -> Tuple[Optional[float], List[Round]]:
    if user is None or user.id is None:
        return None, []
    rounds = await db.rounds.get_rounds_for_user(str(user.id), limit=WHS_WINDOW)
    return hcap.player_handicap_index(user, list(reversed(rounds))), rounds


async def player_handicap_index(db: DatabaseManager, user: Optional[User]) -> Optional[float]:
    index, _ = await player_handicap_index_with_rounds(db, user)
    return index
