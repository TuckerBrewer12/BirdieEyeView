"""Whether a figure reads for the better: the one good/bad/neutral call every screen colours by.

Its own module so `stats`, `dashboard` and `round_comparison` can all use it without importing each other.
"""

from typing import Literal, Optional

# Whether a figure's move is for the better (a score or a handicap falling is good): shown green, red or muted.
ChangeVerdict = Literal["good", "bad", "neutral"]


def change_verdict(change: Optional[float], lower_is_better: bool = True) -> Optional[ChangeVerdict]:
    """Whether a move in a figure is for the better. Most improve as they fall (a score, a
    handicap, putts); `lower_is_better=False` is for one that improves as it rises (greens hit)."""
    if change is None:
        return None
    if change == 0:
        return "neutral"
    return "good" if (change < 0) == lower_is_better else "bad"
