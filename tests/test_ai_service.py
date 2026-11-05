from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import services.ai_service as ai_module
from models import User
from services.ai_service import AIService
from tests.analytics_builders import PARS_18, course, round_
from tests.helpers import make_analytics_round


@pytest.mark.parametrize(
    ("handicap", "label"),
    # Band edges: just below and at each tested boundary, plus unrated and above the scale.
    [(None, "Unrated"), (4.9, "0–5 HCP"), (5, "5–10 HCP"), (27.9, "20–28 HCP"), (28, "28–54 HCP"), (60, "28–54 HCP")],
)
def test_benchmark_uses_handicap_range(handicap, label):
    assert ai_module._get_benchmark(handicap)[1] == label


@pytest.mark.parametrize(
    ("values", "lower_is_better", "threshold", "expected"),
    [
        ([1, 1, 1], True, 0.1, "stable"),  # fewer than 4 observations
        ([4, 3, 2, 1], True, 0.1, "improving"),
        ([1, 2, 3, 4], False, 0.1, "improving"),
        ([1, 2, 3, 4], True, 0.1, "declining"),
        ([4, 3, 2, 1], False, 0.1, "declining"),
        ([None, 4, None, 3, 2, 1], True, 0.1, "improving"),  # unknowns are skipped, not zero
        ([0, 0, 0.125, 0.125], True, 0.25, "stable"),  # change below the threshold
        ([0, 0, 0.125, 0.125], True, 0.125, "declining"),  # change equal to the threshold counts
        ([0, 0, 0.125, 0.125], True, 0.0625, "declining"),
    ],
)
def test_trend_direction(values, lower_is_better, threshold, expected):
    assert ai_module._trend_direction(values, lower_is_better=lower_is_better, threshold=threshold) == expected


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
        "Scrambling %",
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


# ================================================================
# Confirmed bugs (real rounds)
# ================================================================


@pytest.mark.parametrize("handicap", [-1.0, -10.0])
def test_plus_handicaps_use_the_lowest_band(handicap):
    benchmark, label = ai_module._get_benchmark(handicap)

    assert (benchmark, label) == (ai_module._BENCHMARKS[(0, 5)], "Plus HCP")


def test_rounds_without_putts_are_not_an_improving_trend():
    def played(i, putts):
        scores = {n: {"strokes": PARS_18[n] + 1} | ({"putts": putts} if putts else {}) for n in range(1, 19)}
        return round_(scores, course_obj=course(18), round_id=str(i))

    rounds = [played(i, 3 if i < 6 else None) for i in range(3)] + [played(i, None) for i in range(3, 6)]

    metrics = AIService(SimpleNamespace())._compute_raw(rounds)

    assert metrics["avg_three_putts"] == 18.0
    assert metrics["three_putt_trend"] == [18, 18, 18]
    assert ai_module._trend_direction(metrics["three_putt_trend"]) == "stable"


def test_scrambling_is_labeled_scrambling():
    insight = AIService(SimpleNamespace())._insight_scrambling(
        {"avg_scrambling": 10.0, "scrambling_rounds_with_data": 5}, ai_module._BENCHMARKS[(10, 15)]
    )

    assert (insight.category, insight.metric_label) == ("Scrambling", "Scrambling %")


def test_putting_savings_use_the_greens_actually_hit():
    raw = {"putts_per_gir": 2.0, "putts_per_gir_trend": [], "gir_holes_per_round": 1.0}

    insight = AIService(SimpleNamespace())._insight_putting_quality(raw, ai_module._BENCHMARKS[(10, 15)])

    assert "saves ~0.1 strokes/round" in insight.what_if  # 0.12 gap x 1 green, not x 8


@pytest.mark.asyncio
async def test_suggestions_compute_real_metrics_from_rounds():
    """Public path with real rounds and hand-worked values (no patched _compute_raw)."""
    from datetime import datetime

    def played(round_id, day, gir):
        scores = {n: {"strokes": PARS_18[n] + (0 if gir(n) else 1), "putts": 2, "green_in_regulation": gir(n)}
                  for n in range(1, 19)}
        return round_(scores, course_obj=course(18), round_id=round_id, date=datetime(2026, 1, day))

    half_greens = played("a", 1, lambda n: n <= 9)        # 9 hits, 9 misses, +9
    unknown_greens = played("b", 2, lambda n: None)       # GIR unknown: not a miss, +18
    no_greens = played("c", 3, lambda n: False)           # measured 0 of 18, +18
    service = AIService(make_ai_database(list(reversed([half_greens, unknown_greens, no_greens]))))

    suggestions = await service.generate_suggestions("u1")

    values = {item.metric: item.player_value for item in suggestions.comparisons}
    assert values["GIR %"] == 25.0               # 9 / 36 observed greens; 16.7 if unknown counted as missed
    assert values["Scoring Avg (to par)"] == 15.0  # (9 + 18 + 18) / 3
    assert values["Putts per Round"] == 36.0
    assert values["Scrambling %"] == 0.0         # 27 missed greens, none saved
    # Seed 12 with no reset date: only the +9 round (below the seed) counts early on, so the index is 9.0.
    assert (suggestions.handicap_index, suggestions.handicap_range_label) == (9.0, "5–10 HCP")
    assert suggestions.rounds_analyzed == 3
