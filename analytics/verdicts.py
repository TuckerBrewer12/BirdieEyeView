from typing import Literal, Optional

from analytics.handicap import round_half_up

ChangeVerdict = Literal["good", "bad", "neutral"]

TWO_PUTTS = 2


def change_verdict(change: Optional[float], lower_is_better: bool = True) -> Optional[ChangeVerdict]:
    if change is None:
        return None
    if change == 0:
        return "neutral"
    return "good" if (change < 0) == lower_is_better else "bad"


def putts_verdict(average_putts: Optional[float]) -> Optional[ChangeVerdict]:
    if average_putts is None:
        return None
    return change_verdict(round_half_up(average_putts - TWO_PUTTS, 1))
