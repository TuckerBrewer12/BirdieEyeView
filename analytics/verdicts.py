from typing import Literal, Optional

ChangeVerdict = Literal["good", "bad", "neutral"]


def change_verdict(change: Optional[float], lower_is_better: bool = True) -> Optional[ChangeVerdict]:
    if change is None:
        return None
    if change == 0:
        return "neutral"
    return "good" if (change < 0) == lower_is_better else "bad"
