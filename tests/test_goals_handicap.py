from datetime import datetime

import pytest

import analytics.goals as goals
import analytics.handicap as handicap
from models import Course, Hole, HoleScore, Round, Tee


def _make_round(
    score: int = 90,
    *,
    round_id: str = "round-1",
    played_at: datetime | None = None,
    rated: bool = False,
    holes: int = 18,
    par_played: int | None = 4,
) -> Round:
    base, remainder = divmod(score, holes)
    scores = [
        HoleScore(
            hole_number=index,
            strokes=base + (1 if index <= remainder else 0),
            par_played=par_played,
        )
        for index in range(1, holes + 1)
    ]
    course = None
    tee_box = None
    if rated:
        course = Course(
            name="Rated Course",
            holes=[Hole(number=index, par=4, handicap=index) for index in range(1, 19)],
            tees=[Tee(color="Blue", course_rating=72.0, slope_rating=113.0)],
        )
        tee_box = "Blue"
    return Round(id=round_id, date=played_at, course=course, tee_box=tee_box, hole_scores=scores)


def _patch_goal_inputs(monkeypatch, *, active: bool = True) -> None:
    monkeypatch.setattr(
        goals,
        "three_putts_per_round",
        lambda rounds: [{"holes_with_putt_data": 18, "three_putt_count": 2 if active else 0}],
    )
    monkeypatch.setattr(
        goals,
        "score_type_distribution_per_round",
        lambda rounds: [{
            "holes_counted": 18,
            "double_bogey": 20 if active else 0,
            "triple_bogey": 10 if active else 0,
            "quad_bogey": 5 if active else 0,
        }],
    )
    monkeypatch.setattr(
        goals,
        "scoring_by_yardage_buckets",
        lambda rounds: [{
            "par": 4,
            "bucket_label": "350-399",
            "average_to_par": 1.25 if active else 0,
            "sample_size": 18,
        }],
    )
    monkeypatch.setattr(
        goals,
        "course_difficulty_profile_by_hole",
        lambda rounds: [{"hole_number": 7, "average_to_par": 1.5 if active else 0, "sample_size": 5}],
    )
    monkeypatch.setattr(
        goals,
        "overall_gir_percentage",
        lambda rounds: {"gir_percentage": 20.0 if active else 60.0},
    )
    monkeypatch.setattr(
        goals,
        "scrambling_per_round",
        lambda rounds: [{"scrambling_percentage": 20.0 if active else 70.0}],
    )
    monkeypatch.setattr(
        goals,
        "scoring_by_par",
        lambda rounds: [{
            "par": 5,
            "sample_size": 8,
            "average_to_par": 1.2 if active else 0.2,
        }],
    )


def test_goal_report_without_scores_returns_empty_report():
    report = goals.goal_report([Round()], 85)

    assert report == {
        "scoring_average": None,
        "best_score": None,
        "scoring_goal": 85,
        "gap": None,
        "on_track": False,
        "savers": [],
    }


def test_goal_report_ranks_all_actionable_savers(monkeypatch):
    _patch_goal_inputs(monkeypatch)
    rounds = [_make_round(90, round_id=f"r-{index}") for index in range(5)]

    report = goals.goal_report(rounds, 85, home_course_rounds=rounds)

    saver_types = {saver["type"] for saver in report["savers"]}
    assert saver_types == {
        "three_putt_bleed",
        "blowup_holes",
        "achilles_heel",
        "home_course_demon",
        "gir_opportunity",
        "scrambling_opportunity",
        "par5_opportunity",
    }
    assert report["scoring_average"] == 90.0
    assert report["best_score"] == 90
    assert report["gap"] == 5.0
    assert report["on_track"] is False
    assert report["savers"] == sorted(report["savers"], key=lambda saver: saver["strokes_saved"], reverse=True)
    assert all(saver["strokes_saved"] >= 0.1 for saver in report["savers"])


def test_goal_report_on_track_uses_maintenance_copy(monkeypatch):
    _patch_goal_inputs(monkeypatch)

    report = goals.goal_report([_make_round(72)], 72)

    assert report["on_track"] is True
    assert report["gap"] == 0.0
    assert report["savers"][0]["percentage_of_gap"] == 0.0
    assert "keep eliminating" in next(
        saver["detail"] for saver in report["savers"] if saver["type"] == "three_putt_bleed"
    )


def test_goal_report_omits_non_actionable_inputs(monkeypatch):
    _patch_goal_inputs(monkeypatch, active=False)

    report = goals.goal_report([_make_round(72)], 80, home_course_rounds=[_make_round(72)] * 4)

    assert report["on_track"] is True
    assert report["savers"] == []


def test_score_differential_and_rated_round_paths():
    assert handicap.score_differential(90, 72.0, 113.0) == 18.0

    rated = _make_round(90, rated=True)
    partial = _make_round(45, rated=True, holes=9)
    rows = handicap.score_differentials_per_round([rated, partial, Round(id="empty")])

    assert rows[0]["differential"] == 18.0
    assert rows[0]["course_rating"] == 72.0
    assert rows[0]["slope_rating"] == 113.0
    assert rows[1]["differential"] is None
    assert rows[2]["score"] is None


def test_unrated_round_fallback_and_partial_guards():
    assert handicap._get_differential_for_round(_make_round(90)) == 18.0
    assert handicap._get_differential_for_round(_make_round(45, holes=9)) == 9.0

    partial_with_full_par = _make_round(45, holes=9)
    for score in partial_with_full_par.hole_scores:
        score.par_played = 6
    assert handicap._get_differential_for_round(partial_with_full_par) is None

    no_par = _make_round(45, holes=9, par_played=None)
    assert handicap._get_differential_for_round(no_par) is None


def test_handicap_index_applies_whs_table_seed_and_cap(monkeypatch):
    rounds = [Round(id=str(index)) for index in range(20)]
    differentials = {str(index): float(index + 1) for index in range(20)}
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: differentials[item.id])

    assert handicap.handicap_index(rounds[:2]) is None
    assert handicap.handicap_index(rounds[:3]) == -1.0
    assert handicap.handicap_index(rounds) == 4.5

    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: 80.0)
    assert handicap.handicap_index(rounds[:3]) == 54.0
    assert handicap.handicap_index([], seed_handicap=18.2) == 18.2


def test_seed_handicap_filters_early_rounds_and_honors_seed_date(monkeypatch):
    rounds = [
        Round(id="old-high", date=datetime(2025, 1, 1)),
        Round(id="old-low", date=datetime(2025, 1, 2)),
        Round(id="new-high", date=datetime(2025, 2, 1)),
    ]
    differentials_by_round = {"old-high": 20.0, "old-low": 10.0, "new-high": 22.0}
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: differentials_by_round[item.id])

    assert handicap._eligible_differentials(rounds, seed_handicap=15.0, transition_rounds=2) == [10.0, 22.0]
    assert handicap._eligible_differentials(
        rounds,
        seed_handicap=15.0,
        seed_set_at=datetime(2025, 1, 15),
    ) == [10.0, 22.0]
    assert handicap.handicap_index(rounds[:1], seed_handicap=15.0) == 15.0
    assert handicap.handicap_index(rounds[1:2], seed_handicap=15.0) == 10.0


def test_handicap_trend_and_annotation_prefers_recent_tie(monkeypatch):
    rounds = [Round(id=str(index)) for index in range(4)]
    differentials_by_round = {"0": 12.0, "1": 10.0, "2": 10.0, "3": 14.0}
    monkeypatch.setattr(handicap, "_get_differential_for_round", lambda item: differentials_by_round[item.id])

    trend = handicap.handicap_trend(rounds)
    assert [entry["handicap_index"] for entry in trend] == [None, None, 8.0, 9.0]

    handicap.annotate_used_in_hi(trend)
    assert trend[1]["used_in_hi"] is False
    assert trend[2]["used_in_hi"] is True
    assert all(entry["hi_threshold"] == 10.0 for entry in trend)

    short = [{"differential": None}, {"differential": 8.0}]
    handicap.annotate_used_in_hi(short)
    assert short == [
        {"differential": None, "hi_threshold": None, "used_in_hi": None},
        {"differential": 8.0, "hi_threshold": None, "used_in_hi": False},
    ]
