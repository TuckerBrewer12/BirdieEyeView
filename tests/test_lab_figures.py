"""The Lab's figures: the peak game, putting averages, recent form and the goal's counts."""

from analytics import goals, peak
from analytics.headline import headline
from analytics import stats as analytics
from models import HoleScore, Round


def _round(strokes, *, round_id=None, putts=2, par=4):
    """A round of par-4 holes, one hole per stroke count."""
    return Round(id=round_id, course_name_played=f"Course {round_id}", hole_scores=[
        HoleScore(hole_number=i + 1, strokes=s, par_played=par, putts=putts)
        for i, s in enumerate(strokes)
    ])


def _scored(total, round_id):
    """An 18-hole round adding up to `total`, the extra strokes on the first holes."""
    base, extra = divmod(total, 18)
    return _round([base + 1] * extra + [base] * (18 - extra), round_id=round_id)


def test_peak_game_takes_the_best_three_rounds_lowest_first():
    rounds = [_scored(95, "a"), _scored(88, "b"), _scored(91, "c"), _scored(86, "d"), _scored(99, "e")]
    game = peak.peak_game(rounds)
    assert [r["score"] for r in game["rounds"]] == [86, 88, 91]
    assert game["rounds"][0] == {"round_id": "d", "course_name": "Course d", "score": 86}
    assert game["average"] == 88.3
    assert peak.peak_gap(rounds, 84) == 4.3
    assert peak.peak_gap(rounds, 89) == -0.7
    assert peak.peak_meets_goal(rounds, 84) is False
    assert peak.peak_meets_goal(rounds, 89) is True


def test_peak_game_keeps_the_older_round_on_a_tie_and_needs_two_scored_rounds():
    tied = [_scored(90, "old"), _scored(92, "x"), _scored(90, "new"), _scored(89, "best")]
    assert [r["round_id"] for r in peak.peak_game(tied)["rounds"]] == ["best", "old", "new"]

    assert peak.peak_game([_scored(88, "only"), Round(id="blank")]) is None
    assert peak.peak_gap([_scored(88, "only")], 89) is None
    assert peak.peak_meets_goal([_scored(88, "only")], 89) is None


def test_peak_impacts_count_birdies_bogeys_and_doubles_a_round():
    rounds = [
        _round([3, 5] + [4] * 16, round_id="a"),  # 72: a birdie and a bogey
        _round([5] + [4] * 17, round_id="b"),  # 73: a bogey
        _round([6, 6] + [5] * 4 + [4] * 12, round_id="c"),  # 80: two doubles, four bogeys; not a peak round
        _round([4] * 18, round_id="d"),  # 72: all pars
    ]
    impacts = {row["kind"]: row for row in peak.peak_game(rounds)["impacts"]}
    # A birdie a round is a stroke gained: a third at the peak against a quarter over all four.
    assert impacts["birdies"] == {"kind": "birdies", "peak": 0.33, "average": 0.25, "strokes": 0.08}
    # A bogey fewer a round gains a stroke.
    assert impacts["bogeys"] == {"kind": "bogeys", "peak": 0.67, "average": 1.5, "strokes": 0.83}
    # A double fewer gains two.
    assert impacts["doubles"] == {"kind": "doubles", "peak": 0.0, "average": 0.5, "strokes": 1.0}


def test_peak_impacts_need_holes_with_a_par():
    no_par = [Round(id=str(i), hole_scores=[HoleScore(hole_number=1, strokes=s)]) for i, s in enumerate([4, 5])]
    assert peak.peak_impacts(no_par) == []


def test_three_putt_averages_skip_rounds_without_putts():
    rounds = [
        _round([4] * 18, putts=3),  # 18 three-putts, all 18 holes
        _round([4] * 18, putts=2),  # none
        _round([4] * 18, putts=None),  # no putts recorded: left out
    ]
    assert analytics.three_putt_averages(rounds) == {"per_round": 9.0, "rate": 50.0}
    assert analytics.three_putt_averages([_round([4] * 18, putts=None)]) == {"per_round": None, "rate": None}


def test_scoring_move_waits_for_five_scored_rounds():
    # The analytics page's one scoring move is its headline's.
    four = [_scored(90, str(i)) for i in range(4)]
    assert headline(four, {})[0]["change"] is None
    # The last five average 88 against 89.33 over all six.
    six = [_scored(s, str(i)) for i, s in enumerate([96, 88, 88, 88, 88, 88])]
    scoring = headline(six, {})[0]
    assert (scoring["metric"], scoring["change"], scoring["verdict"]) == ("scoring_average", -1.3, "good")


def test_goal_attempts_mark_each_scored_round_at_or_under_the_goal():
    rounds = [_scored(92, "a"), Round(id="blank"), _scored(89, "b"), _scored(90, "c")]
    assert goals.goal_attempts(rounds, 89) == [
        {"round_id": "a", "score": 92, "met_goal": False},
        {"round_id": "b", "score": 89, "met_goal": True},
        {"round_id": "c", "score": 90, "met_goal": False},
    ]
    assert goals.goal_report(rounds, 89)["attempts"] == goals.goal_attempts(rounds, 89)
    assert goals.goal_report([Round()], 89)["attempts"] == []


def test_best_round_takes_the_first_on_a_tie():
    newest_first = [_scored(85, "new"), _scored(82, "tied-newer"), _scored(82, "tied-older"), Round(id="blank")]
    assert analytics.best_round(newest_first).id == "tied-newer"
    assert analytics.best_round([Round(id="blank")]) is None


def test_goal_report_counts_rounds_meeting_the_goal_and_the_peak_gap():
    rounds = [_scored(s, str(i)) for i, s in enumerate([92, 89, 90, 85, 94])]
    report = goals.goal_report(rounds, 89)
    assert report["rounds_meeting_goal"] == 2
    # Best three: 85, 89, 90 average 88.0, a stroke inside the goal.
    assert report["peak_gap"] == -1.0
    empty = goals.goal_report([Round()], 89)
    assert empty["rounds_meeting_goal"] == 0
    assert empty["peak_gap"] is None
