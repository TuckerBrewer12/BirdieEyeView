"""The Lab's benchmarks: which one a player is held up against, and how their par types compare."""

from analytics import benchmarks
from models import HoleScore, Round


def _round(strokes_by_par, round_id=None):
    """A round with one hole per (par, strokes) pair."""
    return Round(id=round_id, hole_scores=[
        HoleScore(hole_number=i + 1, strokes=strokes, par_played=par, putts=2)
        for i, (par, strokes) in enumerate(strokes_by_par)
    ])


def _scored(total, round_id):
    """An 18-hole round of par 4s adding up to `total`."""
    base, extra = divmod(total, 18)
    return _round([(4, base + 1)] * extra + [(4, base)] * (18 - extra), round_id)


def test_each_handicap_and_goal_has_one_shape():
    assert benchmarks.handicap_benchmark(15) == {
        "gir_percentage": 24, "scrambling_percentage": 21, "putts_per_gir": 2.1,
        "par3_to_par": 0.6, "par4_to_par": 1.025, "par5_to_par": 1.1,
    }
    # A handicap is the goal its golfers break: a 15 breaks 90.
    assert benchmarks.handicap_benchmark(15) == benchmarks.goal_benchmark(89)
    assert benchmarks.handicap_benchmark(7) is None


def test_nearest_goal_takes_the_lower_on_a_tie():
    assert benchmarks.nearest_goal(88.4) == 89
    assert benchmarks.nearest_goal(76.5) == 74
    assert benchmarks.nearest_goal(86.5) == 84
    assert benchmarks.nearest_goal(120) == 99
    assert benchmarks.nearest_goal(60) == 71


def test_par_types_are_judged_on_the_gap_as_shown():
    scoring_by_par = [
        {"par": 3, "average_to_par": 0.8, "sample_size": 4},
        {"par": 4, "average_to_par": 1.2, "sample_size": 10},
        {"par": 5, "average_to_par": 1.104, "sample_size": 4},
    ]
    rows = benchmarks.par_type_comparison(scoring_by_par, benchmarks.handicap_benchmark(15))
    assert [(r["par"], r["gap"], r["verdict"]) for r in rows] == [
        (3, 0.2, "behind"),
        (4, 0.18, "behind"),
        # 0.004 a hole reads 0.00, so it is even rather than behind.
        (5, 0.0, "even"),
    ]
    ahead = benchmarks.par_type_comparison([{"par": 3, "average_to_par": 0.35, "sample_size": 2}],
                                           benchmarks.handicap_benchmark(15))
    assert (ahead[0]["gap"], ahead[0]["verdict"]) == (-0.25, "ahead")
    # A par type not played, or nothing to compare with, has no gap.
    assert ahead[1] == {"par": 4, "average_to_par": None, "benchmark_to_par": 1.025, "gap": None, "verdict": None}
    alone = benchmarks.par_type_comparison(scoring_by_par, None)
    assert all(r["gap"] is None and r["benchmark_to_par"] is None for r in alone)


def test_the_peak_is_held_against_the_goal_its_average_plays_to():
    rounds = [_scored(s, str(i)) for i, s in enumerate([95, 88, 91, 86, 99])]
    # The best three (86, 88, 91) average 88.3, nearest breaking 90.
    found = benchmarks.peak_comparison(rounds)
    assert (found["against"], found["goal"], found["handicap"]) == ("peak", 89, None)
    assert found["benchmark"] == benchmarks.goal_benchmark(89)
    assert found["par_types"][1]["benchmark_to_par"] == 1.025

    none = benchmarks.peak_comparison([_scored(90, "only")])
    assert none["benchmark"] is None and none["goal"] is None


def test_a_friend_is_held_up_by_their_own_figures():
    mine = [_round([(3, 4), (4, 4), (5, 5)])]
    theirs = [_round([(3, 3), (4, 5)])]
    found = benchmarks.friend_comparison(mine, theirs)
    assert found["benchmark"]["par3_to_par"] == 0.0
    assert found["benchmark"]["par4_to_par"] == 1.0
    # They have played no par 5, so there is nothing to hold that one against.
    assert found["benchmark"]["par5_to_par"] is None
    assert [(r["gap"], r["verdict"]) for r in found["par_types"]] == [(1.0, "behind"), (-1.0, "ahead"), (None, None)]
    assert benchmarks.friend_comparison(mine, [])["benchmark"] is None
    # The radar's par axes take the par rows' verdicts.
    assert [found["verdicts"][f"par{par}_to_par"] for par in (3, 4, 5)] == ["behind", "ahead", None]


def test_radar_axes_are_judged_with_higher_better_only_for_the_rates():
    mine = {"gir_percentage": 40.0, "scrambling_percentage": 20.0, "putts_per_gir": 1.9,
            "par3_to_par": None, "par4_to_par": None, "par5_to_par": None}
    theirs = {"gir_percentage": 36, "scrambling_percentage": 31, "putts_per_gir": 1.9,
              "par3_to_par": 0.3, "par4_to_par": 0.5, "par5_to_par": 0.6}
    par_types = [{"par": 3, "verdict": "ahead"}, {"par": 4, "verdict": None}, {"par": 5, "verdict": "behind"}]
    assert benchmarks.shape_verdicts(mine, theirs, par_types) == {
        "gir_percentage": "ahead",
        "scrambling_percentage": "behind",
        "putts_per_gir": "even",
        "par3_to_par": "ahead",
        "par4_to_par": None,
        "par5_to_par": "behind",
    }
    assert set(benchmarks.shape_verdicts(mine, None, par_types).values()) <= {None, "ahead", "behind"}


def test_handicap_comparison_names_the_handicap():
    found = benchmarks.handicap_comparison([_round([(4, 5)])], 5)
    assert (found["against"], found["handicap"], found["goal"]) == ("handicap", 5, None)
    assert found["par_types"][1]["gap"] == 0.5
