from dataclasses import dataclass
from datetime import date, timedelta
from functools import cached_property
from typing import Any, Dict, List, Literal, Optional, Protocol, Sequence

from analytics import best_rounds
from analytics import eligibility as el
from analytics import handicap as hcap
from models import Round, User

HOME_COURSE = "home"
Timeframe = Literal["ytd", "1y"]


class RoundSource(Protocol):
    async def get_rounds_for_user(self, user_id: str, *, limit: Optional[int]) -> List[Round]: ...


@dataclass(frozen=True)
class RoundWindow:
    rounds: List[Round]
    newest_first: List[Round]


def timeframe_start(timeframe: Optional[Timeframe], today: date) -> Optional[date]:
    if timeframe == "ytd":
        return date(today.year, 1, 1)
    if timeframe == "1y":
        return today - timedelta(days=365)
    return None


class PlayerHistory:
    def __init__(self, user: Optional[User], newest_first: Sequence[Round]):
        self.user = user
        self.newest_first = list(newest_first)
        self.rounds = el.chronological(reversed(self.newest_first))

    @classmethod
    async def load(cls, source: RoundSource, user: Optional[User]) -> "PlayerHistory":
        if user is None or user.id is None:
            return cls(user, [])
        return cls(user, await source.get_rounds_for_user(str(user.id), limit=None))

    @classmethod
    async def load_rounds_of(cls, source: RoundSource, user_id: str) -> "PlayerHistory":
        return cls(None, await source.get_rounds_for_user(user_id, limit=None))

    def window(
        self,
        *,
        limit: Optional[int] = None,
        course_id: Optional[str] = None,
        since: Optional[date] = None,
    ) -> RoundWindow:
        if course_id == HOME_COURSE:
            home = self.user.home_course_id if self.user is not None else None
            if home is None:
                return RoundWindow([], [])
            course_id = str(home)
        picked = [r for r in self.newest_first if _played_on(r, course_id) and _played_since(r, since)]
        if limit is not None:
            picked = picked[:limit]
        return RoundWindow(el.chronological(reversed(picked)), picked)

    def last_full_rounds(self, count: int) -> List[Round]:
        return best_rounds.full_rounds(self.rounds)[-count:]

    @property
    def handicap_index(self) -> Optional[float]:
        return self.index_window["index"]

    @cached_property
    def index_window(self) -> Dict[str, Any]:
        return hcap.player_index_window(self.user, self.rounds)

    @property
    def index_rounds(self) -> List[Round]:
        return [r for i, r in enumerate(self.rounds) if i in self.index_window["eligible"]]

    def handicap_rows(self, rounds: Sequence[Round]) -> List[Dict[str, Any]]:
        return [self._handicap_row_by_round[id(r)] for r in rounds]

    @cached_property
    def _handicap_row_by_round(self) -> Dict[int, Dict[str, Any]]:
        trend = hcap.player_handicap_trend(self.user, self.rounds)
        return {id(r): row for r, row in zip(self.rounds, trend)}


def _played_on(round_obj: Round, course_id: Optional[str]) -> bool:
    if course_id is None:
        return True
    return round_obj.course is not None and str(round_obj.course.id) == str(course_id)


def _played_since(round_obj: Round, since: Optional[date]) -> bool:
    if since is None:
        return True
    return round_obj.date is not None and round_obj.date.date() >= since
