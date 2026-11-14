from analytics.round_comparison import round_vs_average
from models import HoleScore, Round


def _round(strokes, putts=2, gir=False):
    return Round(hole_scores=[
        HoleScore(hole_number=i + 1, strokes=s, par_played=4, putts=putts, green_in_regulation=gir)
        for i, s in enumerate(strokes)
    ])


def _window(result, name):
    return next(w for w in result["windows"] if w["window"] == name)


def _figure(window, metric):
    return next(m for m in window["metrics"] if m["metric"] == metric)


def test_a_round_is_set_against_the_rounds_before_it_not_itself():
    rounds = [_round([5] * 18), _round([4] * 18), _round([4] * 18, putts=1)]
    score = _figure(_window(round_vs_average(rounds, 2), "all"), "score")
    assert score == {"metric": "score", "value": 72.0, "average": 81.0, "difference": -9.0, "verdict": "good"}


def test_each_window_counts_the_rounds_it_averages():
    rounds = [_round([4] * 18) for _ in range(8)]
    result = round_vs_average(rounds, 7)
    assert [(w["window"], w["rounds"]) for w in result["windows"]] == [("l5", 5), ("l20", 7), ("all", 7)]


def test_the_last_five_leave_out_older_rounds():
    rounds = [_round([6] * 18)] + [_round([4] * 18) for _ in range(5)] + [_round([4] * 18)]
    assert _figure(_window(round_vs_average(rounds, 6), "l5"), "score")["average"] == 72.0
    assert _figure(_window(round_vs_average(rounds, 6), "all"), "score")["average"] == 78.0


def test_greens_and_scrambling_are_better_higher():
    rounds = [_round([4] * 18, gir=False), _round([4] * 18, gir=True)]
    greens = _figure(_window(round_vs_average(rounds, 1), "l5"), "greens")
    assert greens["difference"] == 18.0
    assert greens["verdict"] == "good"


def test_putts_per_green_are_to_a_hundredth():
    earlier = _round([4] * 18, putts=2, gir=True)
    this = Round(hole_scores=[
        HoleScore(hole_number=i + 1, strokes=4, par_played=4, putts=1 if i < 6 else 2, green_in_regulation=True)
        for i in range(18)
    ])
    figure = _figure(_window(round_vs_average([earlier, this], 1), "l5"), "putts_per_gir")
    assert figure["value"] == 1.67
    assert figure["difference"] == -0.33
    assert figure["verdict"] == "good"


def test_an_unchanged_figure_is_neutral():
    rounds = [_round([4] * 18), _round([4] * 18)]
    assert _figure(_window(round_vs_average(rounds, 1), "l5"), "putts")["verdict"] == "neutral"


def test_the_first_round_has_no_average():
    result = round_vs_average([_round([4] * 18)], 0)
    window = _window(result, "l5")
    assert window["rounds"] == 0
    assert _figure(window, "score") == {
        "metric": "score", "value": 72.0, "average": None, "difference": None, "verdict": None,
    }
