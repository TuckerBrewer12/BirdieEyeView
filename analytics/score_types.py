from typing import get_args

from models.hole_score import ScoreKind

SCORE_KINDS = list(get_args(ScoreKind))

SCORE_TYPE_ORDER = [
    "eagle",
    "birdie",
    "par",
    "bogey",
    "double_bogey",
    "triple_bogey",
    "quad_bogey",
]


def score_type_from_to_par(to_par: int) -> str:
    if to_par <= -2:
        return "eagle"
    if to_par == -1:
        return "birdie"
    if to_par == 0:
        return "par"
    if to_par == 1:
        return "bogey"
    if to_par == 2:
        return "double_bogey"
    if to_par == 3:
        return "triple_bogey"
    return "quad_bogey"
