"""Report charts: gaps for unknown data, label checks, tick limits, wording, and export runs."""

import math
from datetime import datetime

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt  # noqa: E402
import pytest  # noqa: E402

from analytics import visualizations as viz  # noqa: E402
from analytics import visualize_player_from_db as export  # noqa: E402
from models.hole_layout import FULL_ROUND  # noqa: E402
from tests.analytics_builders import PARS_18, course, par_round, round_  # noqa: E402


@pytest.fixture(autouse=True)
def close_figures():
    yield
    plt.close("all")


def full_data_round(round_id, date=datetime(2026, 1, 1)):
    scores = {n: {"strokes": PARS_18[n] + (n % 2), "putts": 2, "green_in_regulation": n % 3 == 0}
              for n in FULL_ROUND}
    return round_(scores, course_obj=course(18, rating=72.0, slope=113), round_id=round_id, date=date, tee_box="Blue")


def test_unknown_score_is_a_gap_not_zero():
    rounds = [par_round(round_id="a"), par_round(holes=[1, 2], course_obj=course(18), round_id="partial")]

    _, ax = viz.plot_score_trend(rounds)

    y = ax.lines[0].get_ydata()
    assert y[0] == 72 and math.isnan(y[1])


def test_unknown_putts_are_not_drawn_as_zero_bars():
    rounds = [full_data_round("a"), par_round(round_id="no-putts")]

    _, ax = viz.plot_putts_per_round(rounds)

    heights = [bar.get_height() for bar in ax.patches]
    assert heights[0] == 36 and math.isnan(heights[1])


def test_custom_labels_must_match_the_rounds():
    with pytest.raises(ValueError, match="1 labels for 2 rounds"):
        viz.plot_putts_per_round([full_data_round("a"), full_data_round("b")], labels=["only one"])


def test_sparse_ticks_respect_the_limit():
    _, ax = plt.subplots()

    viz._apply_sparse_xticks(ax, [f"R{i}" for i in range(23)], max_labels=12)

    ticks = list(ax.get_xticks())
    assert len(ticks) <= 12 and ticks[0] == 0 and ticks[-1] == 22


def test_scrambling_legend_names_the_plotted_metric():
    _, ax = viz.plot_scrambling_per_round([full_data_round("a")])

    labels = [text.get_text() for text in ax.get_legend().get_texts()]
    assert "Scrambled (par or better)" in labels and "Successful Up-and-Downs" not in labels


def test_summary_chart_without_data_says_so():
    _, ax = viz.plot_overall_gir_percentage([par_round()])

    assert any("No greens" in text.get_text() for text in ax.texts)


def test_export_writes_a_fresh_folder_per_run_and_closes_figures(tmp_path):
    rounds = [full_data_round("a", datetime(2026, 1, 1)), full_data_round("b", None)]  # undated last, no crash

    first = export.export_charts("Tucker B", rounds, tmp_path, now=datetime(2026, 11, 4, 9, 0, 0))
    second = export.export_charts("Tucker B", [par_round()], tmp_path, now=datetime(2026, 11, 4, 9, 5, 0))

    assert first and all(path.is_relative_to(tmp_path / "tucker-b" / "20261104-090000") for path in first)
    assert all(path.is_relative_to(tmp_path / "tucker-b" / "20261104-090500") for path in second)
    assert len(second) < len(first)  # no putts/GIR: those charts are skipped, not stale copies
    assert plt.get_fignums() == []


def test_failed_save_still_closes_the_figure(tmp_path, monkeypatch):
    fig, _ = plt.subplots()
    monkeypatch.setattr(fig, "savefig", lambda *a, **k: (_ for _ in ()).throw(OSError("disk full")))

    with pytest.raises(RuntimeError, match="disk full"):
        export._save(fig, tmp_path / "chart.png")

    assert plt.get_fignums() == []


def test_limit_must_be_positive():
    import argparse

    for bad in ("0", "-1"):
        with pytest.raises(argparse.ArgumentTypeError):
            export._positive_int(bad)
