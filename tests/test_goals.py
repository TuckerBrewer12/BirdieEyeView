import analytics.goals as goals
from models import Round
from tests.helpers import make_scoring_round


def patch_goal_inputs(monkeypatch, *, active: bool = True) -> None:
    monkeypatch.setattr(
        goals,
        "three_putts_per_round",
        lambda rounds: [{"holes_with_putt_data": 18, "three_putt_count": 2 if active else 0}],
    )
    monkeypatch.setattr(
        goals,
        "score_type_distribution_per_round",
        lambda rounds: [
            {
                "holes_counted": 18,
                "double_bogey": 20 if active else 0,
                "triple_bogey": 10 if active else 0,
                "quad_bogey": 5 if active else 0,
            }
        ],
    )
    monkeypatch.setattr(
        goals,
        "scoring_by_yardage_buckets",
        lambda rounds: [
            {
                "par": 4,
                "bucket_label": "350-399",
                "average_to_par": 1.25 if active else 0,
                "sample_size": 18,
            }
        ],
    )
    monkeypatch.setattr(
        goals,
        "course_difficulty_profile_by_hole",
        lambda rounds: [
            {
                "hole_number": 7,
                "average_to_par": 1.5 if active else 0,
                "sample_size": 5,
            }
        ],
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
        lambda rounds: [
            {
                "par": 5,
                "sample_size": 8,
                "average_to_par": 1.2 if active else 0.2,
            }
        ],
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


def test_goal_report_calculates_score_summary(monkeypatch):
    patch_goal_inputs(monkeypatch)
    rounds = [make_scoring_round(90, round_id=f"r-{index}") for index in range(5)]

    report = goals.goal_report(rounds, 85, home_course_rounds=rounds)

    assert (
        report["scoring_average"],
        report["best_score"],
        report["gap"],
        report["on_track"],
    ) == (90.0, 90, 5.0, False)


def test_goal_report_ranks_all_actionable_savers(monkeypatch):
    patch_goal_inputs(monkeypatch)
    rounds = [make_scoring_round(90, round_id=f"r-{index}") for index in range(5)]

    savers = goals.goal_report(rounds, 85, home_course_rounds=rounds)["savers"]

    assert {saver["type"] for saver in savers} == {
        "three_putt_bleed",
        "blowup_holes",
        "achilles_heel",
        "home_course_demon",
        "gir_opportunity",
        "scrambling_opportunity",
        "par5_opportunity",
    }
    assert savers == sorted(savers, key=lambda saver: saver["strokes_saved"], reverse=True)
    assert all(saver["strokes_saved"] >= 0.1 for saver in savers)


def test_on_track_goal_uses_zero_gap_percentages(monkeypatch):
    patch_goal_inputs(monkeypatch)

    report = goals.goal_report([make_scoring_round(72)], 72)

    assert (report["on_track"], report["gap"]) == (True, 0.0)
    assert all(saver["percentage_of_gap"] == 0.0 for saver in report["savers"])


def test_on_track_goal_uses_maintenance_copy(monkeypatch):
    patch_goal_inputs(monkeypatch)

    savers = goals.goal_report([make_scoring_round(72)], 72)["savers"]
    three_putt_saver = next(saver for saver in savers if saver["type"] == "three_putt_bleed")

    assert "keep eliminating" in three_putt_saver["detail"]


def test_goal_report_omits_non_actionable_inputs(monkeypatch):
    patch_goal_inputs(monkeypatch, active=False)
    round_ = make_scoring_round(72)

    report = goals.goal_report([round_], 80, home_course_rounds=[round_] * 4)

    assert (report["on_track"], report["savers"]) == (True, [])
