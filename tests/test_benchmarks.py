from analytics import benchmarks
from models import HoleScore, Round


def _round(strokes_by_par, round_id=None):
    return Round(id=round_id, hole_scores=[
        HoleScore(hole_number=i + 1, strokes=strokes, par_played=par, putts=2)
        for i, (par, strokes) in enumerate(strokes_by_par)
    ])


def _scored(total, round_id):
    base, extra = divmod(total, 18)
    return _round([(4, base + 1)] * extra + [(4, base)] * (18 - extra), round_id)


def test_each_handicap_and_goal_has_one_shape():
    assert benchmarks.handicap_benchmark(15) == {
        "gir_percentage": 24, "scrambling_percentage": 21, "putts_per_gir": 2.1,
        "par3_to_par": 0.6, "par4_to_par": 1.025, "par5_to_par": 1.1,
    }
    assert benchmarks.handicap_benchmark(7) is None


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
        (5, 0.0, "even"),
    ]
    ahead = benchmarks.par_type_comparison([{"par": 3, "average_to_par": 0.35, "sample_size": 2}],
                                           benchmarks.handicap_benchmark(15))
    assert (ahead[0]["gap"], ahead[0]["verdict"]) == (-0.25, "ahead")
    assert ahead[1] == {"par": 4, "average_to_par": None, "benchmark_to_par": 1.025, "gap": None, "verdict": None}
    alone = benchmarks.par_type_comparison(scoring_by_par, None)
    assert all(r["gap"] is None and r["benchmark_to_par"] is None for r in alone)


def test_a_friend_is_held_up_by_their_own_figures():
    mine = [_round([(3, 4), (4, 4), (5, 5)])]
    theirs = [_round([(3, 3), (4, 5)])]
    found = benchmarks.friend_comparison(mine, theirs)
    assert found["benchmark"]["par3_to_par"] == 0.0
    assert found["benchmark"]["par4_to_par"] == 1.0
    assert found["benchmark"]["par5_to_par"] is None
    assert [(r["gap"], r["verdict"]) for r in found["par_types"]] == [(1.0, "behind"), (-1.0, "ahead"), (None, None)]
    assert benchmarks.friend_comparison(mine, [])["benchmark"] is None
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
    assert (found["against"], found["handicap"]) == ("handicap", 5)
    assert found["par_types"][1]["gap"] == 0.5
