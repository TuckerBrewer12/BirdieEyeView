from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import services.ai_service as ai_module
from models import User
from services.ai_service import AIService
from tests.helpers import make_analytics_round


@pytest.mark.parametrize(
    ("handicap", "label"),
    [(None, "Unrated"), (7, "5–10 HCP"), (60, "28–54 HCP")],
)
def test_benchmark_uses_handicap_range(handicap, label):
    assert ai_module._get_benchmark(handicap)[1] == label


@pytest.mark.parametrize(
    ("values", "lower_is_better", "threshold", "expected"),
    [
        ([1, 1, 1], True, 0.1, "stable"),
        ([4, 3, 2, 1], True, 0.1, "improving"),
        ([1, 2, 3, 4], False, 0.1, "improving"),
        ([1, 1, 1, 1], True, 0.5, "stable"),
    ],
)
def test_trend_direction(values, lower_is_better, threshold, expected):
    assert ai_module._trend_direction(values, lower_is_better=lower_is_better, threshold=threshold) == expected


def test_compute_raw_builds_round_metrics():
    service = AIService(SimpleNamespace())

    metrics = service._compute_raw([make_analytics_round(i) for i in range(6)])

    assert (metrics["num_rounds"], len(metrics["putts_per_gir_trend"])) == (6, 6)
    assert metrics["gir_pct"] is not None
    assert set(metrics["par_avgs"]) == {3, 4, 5}


def make_ai_database(rounds):
    user = User(id="u1", handicap=12)
    return SimpleNamespace(
        users=SimpleNamespace(get_user=AsyncMock(return_value=user)),
        rounds=SimpleNamespace(get_rounds_for_user=AsyncMock(return_value=rounds)),
    )


@pytest.mark.asyncio
async def test_suggestions_return_empty_state_without_rounds():
    service = AIService(make_ai_database([]))

    suggestions = await service.generate_suggestions("u1")

    assert (suggestions.rounds_analyzed, suggestions.insights) == (0, [])


def populated_raw_metrics():
    return {
        "gir_pct": 5.0,
        "putts_per_gir": 3.0,
        "avg_scrambling": 5.0,
        "avg_three_putts": 7.0,
        "avg_putts_per_round": 40.0,
        "avg_to_par": 30.0,
        "par_avgs": {3: 3.0, 4: 4.0, 5: 3.0},
        "par_counts": {3: 24, 4: 60, 5: 24},
        "par_avgs_trend": {
            3: [1, 2, 3, 4],
            4: [1, 2, 3, 4],
            5: [1, 2, 3, 4],
        },
        "gir_values": [30, 20, 10, 5],
        "three_putt_trend": [1, 2, 3, 4],
        "putts_per_gir_trend": [1, 2, 3, 4],
        "scrambling_rounds_with_data": 6,
        "num_rounds": 6,
    }


async def generate_populated_suggestions(monkeypatch):
    rounds = [make_analytics_round(i) for i in range(6)]
    service = AIService(make_ai_database(rounds))
    monkeypatch.setattr(service, "_compute_raw", lambda values: populated_raw_metrics())
    return await service.generate_suggestions("u1", target_handicap=5.0)


@pytest.mark.asyncio
async def test_suggestions_use_target_handicap_benchmark(monkeypatch):
    suggestions = await generate_populated_suggestions(monkeypatch)

    assert (suggestions.rounds_analyzed, suggestions.handicap_range_label) == (
        6,
        "Breaks 80",
    )


@pytest.mark.asyncio
async def test_suggestions_include_actionable_insights(monkeypatch):
    suggestions = await generate_populated_suggestions(monkeypatch)

    assert {item.title for item in suggestions.insights} >= {
        "Hit More Greens",
        "Build Your Short Game",
        "Eliminate 3-Putts",
        "Improve Putts per GIR",
    }


@pytest.mark.asyncio
async def test_suggestions_include_ordered_comparisons(monkeypatch):
    suggestions = await generate_populated_suggestions(monkeypatch)

    assert [item.metric for item in suggestions.comparisons] == [
        "Scoring Avg (to par)",
        "GIR %",
        "Par 3 Avg to Par",
        "Par 4 Avg to Par",
        "Par 5 Avg to Par",
        "Up & Down %",
        "Putts per Round",
        "Putts per GIR",
        "3-Putts per Round",
    ]


@pytest.mark.asyncio
async def test_gir_comparison_marks_higher_as_better(monkeypatch):
    suggestions = await generate_populated_suggestions(monkeypatch)

    gir_comparison = suggestions.comparisons[1]

    assert (gir_comparison.player_value, gir_comparison.lower_is_better) == (
        5.0,
        False,
    )
    assert gir_comparison.has_data is True


def test_strengths_identify_above_benchmark_areas():
    service = AIService(SimpleNamespace())
    benchmark, _ = ai_module._get_benchmark(10)
    metrics = {
        "gir_pct": 80.0,
        "avg_scrambling": 80.0,
        "putts_per_gir": 1.0,
        "par_avgs": {3: -1.0, 4: -1.0, 5: -1.0},
    }

    strengths = service._compute_strengths(metrics, benchmark)

    assert [strength.title for strength in strengths] == [
        "Strong Ball Striking",
        "Excellent Short Game",
        "Great on the Greens",
    ]
    assert (strengths[0].player_value, strengths[0].benchmark_value) == (
        80.0,
        round(benchmark["gir_pct"], 1),
    )
    assert strengths[2].margin_description == (
        f"{round(benchmark['putts_per_gir'] - 1.0, 2)} fewer putts than benchmark"
    )


@pytest.mark.parametrize(
    ("method_name", "metrics"),
    [
        ("_insight_par_performance", {}),
        ("_insight_gir", {"gir_pct": None}),
        (
            "_insight_scrambling",
            {"avg_scrambling": 1, "scrambling_rounds_with_data": 2},
        ),
        ("_insight_three_putts", {"avg_three_putts": None}),
        ("_insight_putting_quality", {"putts_per_gir": None}),
    ],
)
def test_insight_omits_non_actionable_metrics(method_name, metrics):
    service = AIService(SimpleNamespace())
    benchmark, _ = ai_module._get_benchmark(10)

    assert getattr(service, method_name)(metrics, benchmark) is None
