"""Exact domain labels, separate from broader analytics chart groups."""
SCORE_LABELS = {
    -4: 'condor',
    -3: 'albatross',
    -2: 'eagle',
    -1: 'birdie',
    0: 'par',
    1: 'bogey',
    2: 'double bogey',
    3: 'triple bogey',
    4: 'quadruple bogey',
}


def classify_score(relative: int) -> str:
    return SCORE_LABELS.get(relative, f'{abs(relative)} {"under" if relative < 0 else "over"}')
