"""What golfers at each scoring level look like, and how a player's par types stand against them.

The Lab holds a player's shape up against a benchmark: a handicap's, the scoring level their
peak rounds play to, or a friend's. A shape is in golf terms (GIR%, scrambling%, putts per GIR,
and each par type's average to par); the page scales it for the radar. Every function takes the
rounds oldest first.
"""

from typing import Any, Dict, List, Literal, Optional

from analytics import stats as analytics
from analytics.peak import peak_game
from models import Round

Against = Literal["handicap", "peak", "friend"]
Verdict = Literal["ahead", "even", "behind"]
PARS = (3, 4, 5)

# Amateurs by the score they break, from "Representative amateur golf statistics by score and
# skill band": the goal as stored (89 is breaking 90), the handicap it stands for, and the shape.
# Breaking 75 sits between breaking 80 and scratch, so it has no handicap of its own.
BENCHMARKS: List[Dict[str, Any]] = [
    {"goal": 71, "handicap": 0, "gir_percentage": 61, "scrambling_percentage": 47, "putts_per_gir": 1.84,
     "par3_to_par": -0.025, "par4_to_par": 0.175, "par5_to_par": 0.0},
    {"goal": 74, "handicap": None, "gir_percentage": 53, "scrambling_percentage": 44, "putts_per_gir": 1.9,
     "par3_to_par": 0.075, "par4_to_par": 0.35, "par5_to_par": 0.275},
    {"goal": 79, "handicap": 5, "gir_percentage": 44, "scrambling_percentage": 41, "putts_per_gir": 1.94,
     "par3_to_par": 0.2, "par4_to_par": 0.5, "par5_to_par": 0.55},
    {"goal": 84, "handicap": 10, "gir_percentage": 36, "scrambling_percentage": 31, "putts_per_gir": 2.04,
     "par3_to_par": 0.375, "par4_to_par": 0.65, "par5_to_par": 0.725},
    {"goal": 89, "handicap": 15, "gir_percentage": 24, "scrambling_percentage": 21, "putts_per_gir": 2.1,
     "par3_to_par": 0.6, "par4_to_par": 1.025, "par5_to_par": 1.1},
    {"goal": 94, "handicap": 20, "gir_percentage": 17, "scrambling_percentage": 20, "putts_per_gir": 2.18,
     "par3_to_par": 0.775, "par4_to_par": 1.275, "par5_to_par": 1.425},
    {"goal": 99, "handicap": 25, "gir_percentage": 10, "scrambling_percentage": 18, "putts_per_gir": 2.18,
     "par3_to_par": 0.975, "par4_to_par": 1.85, "par5_to_par": 2.0},
]

SHAPE_FIELDS = (
    "gir_percentage", "scrambling_percentage", "putts_per_gir", "par3_to_par", "par4_to_par", "par5_to_par",
)


def _shape(row: Dict[str, Any]) -> Dict[str, Any]:
    return {field: row[field] for field in SHAPE_FIELDS}


def handicap_benchmark(handicap: int) -> Optional[Dict[str, Any]]:
    """The shape of a golfer playing to `handicap`. Null for a handicap with no benchmark."""
    row = next((r for r in BENCHMARKS if r["handicap"] == handicap), None)
    return _shape(row) if row else None


def nearest_goal(average: float) -> int:
    """The goal whose golfers score nearest `average`. A tie goes to the lower goal."""
    return min((row["goal"] for row in BENCHMARKS), key=lambda goal: (abs(goal - average), goal))


def goal_benchmark(goal: int) -> Dict[str, Any]:
    return _shape(next(row for row in BENCHMARKS if row["goal"] == goal))


def _rounded(value: Optional[float], digits: int) -> Optional[float]:
    return round(value, digits) if value is not None else None


def _par_averages(scoring_by_par: List[Dict[str, Any]]) -> Dict[int, Optional[float]]:
    rows = {row["par"]: row for row in scoring_by_par if row["sample_size"] > 0}
    return {par: rows[par]["average_to_par"] if par in rows else None for par in PARS}


def player_shape(rounds: List[Round]) -> Optional[Dict[str, Any]]:
    """A player's shape over their rounds, each figure as the analytics KPIs report it.
    A figure they have nothing for is null. Null without a round."""
    if not rounds:
        return None
    par_averages = _par_averages(analytics.scoring_by_par(rounds))
    return {
        "gir_percentage": analytics.gir_percentage(rounds),
        "scrambling_percentage": analytics.scrambling_percentage(rounds),
        "putts_per_gir": _rounded(analytics.overall_putts_per_gir(rounds)["putts_per_gir"], 2),
        **{f"par{par}_to_par": par_averages[par] for par in PARS},
    }


def _gap(mine: float, theirs: float) -> float:
    """Mine less theirs to a hundredth, a half away from zero, as the page shows an average to par."""
    gap = mine - theirs
    rounded = analytics.round_half_up(abs(gap), 2)
    return -rounded if gap < 0 else rounded


def par_type_comparison(
    scoring_by_par: List[Dict[str, Any]], benchmark: Optional[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Each par type's average to par against the benchmark's: the gap, negative when the player
    scores lower, and whether that puts them ahead, even or behind. Rounded before it is judged,
    so a gap that reads 0.00 is even. Null where either side has no figure."""
    rows = []
    for par, mine in _par_averages(scoring_by_par).items():
        theirs = benchmark.get(f"par{par}_to_par") if benchmark else None
        gap = _gap(mine, theirs) if mine is not None and theirs is not None else None
        verdict: Optional[Verdict] = None
        if gap is not None:
            verdict = "ahead" if gap < 0 else ("behind" if gap > 0 else "even")
        rows.append({"par": par, "average_to_par": mine, "benchmark_to_par": theirs, "gap": gap, "verdict": verdict})
    return rows


def comparison(
    rounds: List[Round],
    against: Against,
    benchmark: Optional[Dict[str, Any]],
    handicap: Optional[int] = None,
    goal: Optional[int] = None,
) -> Dict[str, Any]:
    """The player's par types against `benchmark`, and which benchmark it was."""
    return {
        "against": against,
        "handicap": handicap,
        "goal": goal,
        "benchmark": benchmark,
        "par_types": par_type_comparison(analytics.scoring_by_par(rounds), benchmark),
    }


def handicap_comparison(rounds: List[Round], handicap: int) -> Dict[str, Any]:
    return comparison(rounds, "handicap", handicap_benchmark(handicap), handicap=handicap)


def peak_comparison(rounds: List[Round]) -> Dict[str, Any]:
    """Against the golfers who score what the player's peak rounds average. No benchmark without a peak."""
    peak = peak_game(rounds)
    if peak is None:
        return comparison(rounds, "peak", None)
    goal = nearest_goal(peak["average"])
    return comparison(rounds, "peak", goal_benchmark(goal), goal=goal)


def friend_comparison(rounds: List[Round], friend_rounds: List[Round]) -> Dict[str, Any]:
    return comparison(rounds, "friend", player_shape(friend_rounds))
