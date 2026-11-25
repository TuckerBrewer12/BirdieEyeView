from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from analytics import handicap as hcap
from database.db_manager import DatabaseManager
from models import Round, User



async def player_handicap_index_with_rounds(
    db: DatabaseManager, user: Optional[User]
) -> Tuple[Optional[float], List[Round]]:
    if user is None or user.id is None:
        return None, []
    rounds = await db.rounds.get_rounds_for_user(str(user.id), limit=None)
    return hcap.player_handicap_index(user, list(reversed(rounds))), rounds


async def player_handicap_index(db: DatabaseManager, user: Optional[User]) -> Optional[float]:
    index, _ = await player_handicap_index_with_rounds(db, user)
    return index


@dataclass(frozen=True)
class GolferHandicap:
    user: Optional[User] = None
    index: Optional[float] = None
    rounds: List[Round] = field(default_factory=list)

    def score_to_lower_index(self, course_rating: float, slope_rating: float) -> Optional[int]:
        if self.user is None:
            return None
        return hcap.score_to_lower_index(self.user, self.rounds, course_rating, slope_rating)


async def golfer_handicap(db: DatabaseManager, user: Optional[User]) -> GolferHandicap:
    index, rounds = await player_handicap_index_with_rounds(db, user)
    return GolferHandicap(user, index, rounds) if user is not None else GolferHandicap()
