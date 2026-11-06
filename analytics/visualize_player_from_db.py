"""Export a player's analytics charts from PostgreSQL to PNG files.

Each run writes to its own ``<outdir>/<player>/<timestamp>/`` folder, so files from earlier runs or
other players never mix into a report. A chart is exported only when its own metric has data, and
every figure is closed after saving, including when saving fails. "Overall" charts cover the loaded
rounds (``--limit`` most recent).
"""

from __future__ import annotations

import argparse
import asyncio
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional

from analytics import eligibility as el
from analytics import stats
from analytics.visualizations import (
    plot_average_putts_by_hole,
    plot_average_score_relative_to_par_by_hole,
    plot_average_score_when_gir_vs_missed,
    plot_course_difficulty_profile_by_hole,
    plot_gir_comparison,
    plot_gir_per_round,
    plot_gir_percentage_by_hole,
    plot_gir_vs_non_gir_score_distribution,
    plot_overall_gir_percentage,
    plot_overall_putts_per_gir,
    plot_putts_comparison,
    plot_putts_per_gir,
    plot_putts_per_gir_comparison,
    plot_putts_per_gir_rate_per_round,
    plot_putts_per_round,
    plot_score_comparison,
    plot_score_trend,
    plot_score_trend_on_this_course,
    plot_score_type_distribution_by_hole,
    plot_score_type_distribution_per_round,
    plot_score_variance_by_hole,
    plot_scoring_by_par,
    plot_scoring_vs_handicap,
    plot_scrambling_comparison,
    plot_scrambling_per_round,
    plot_three_putt_percentage_per_round,
    plot_three_putts_comparison,
    plot_three_putts_per_round,
)
from models.round import Round


# ---- availability: ask the metric itself whether it has anything to show

def _any_complete(rounds: List[Round]) -> bool:
    return bool(el.complete_rounds(rounds))


def _has_putts(rounds: List[Round]) -> bool:
    return any(row["three_putt_count"] is not None for row in stats.three_putts_per_round(rounds))


def _has_round_putt_totals(rounds: List[Round]) -> bool:
    return any(row["total_putts"] is not None for row in stats.putts_per_round(rounds))


def _has_putts_per_gir(rounds: List[Round]) -> bool:
    return stats.overall_putts_per_gir(rounds)["putts_per_gir"] is not None


def _has_gir(rounds: List[Round]) -> bool:
    return stats.overall_gir_percentage(rounds)["gir_percentage"] is not None


def _has_scrambling(rounds: List[Round]) -> bool:
    return stats.overall_scrambling(rounds)["opportunities"] > 0


@dataclass(frozen=True)
class Chart:
    folder: str
    name: str
    plot: Callable
    available: Callable[[List[Round]], bool]
    course: bool = False  # plotted for the most-played course with its label


CHARTS = [
    Chart("round_trends", "score_trend", plot_score_trend, _any_complete),
    Chart("round_comparison", "score_comparison", plot_score_comparison, _any_complete),
    Chart("overall_player", "scoring_vs_handicap", plot_scoring_vs_handicap,
          lambda r: bool(stats.scoring_vs_hole_handicap(r))),
    Chart("overall_player", "scoring_by_par", plot_scoring_by_par, lambda r: bool(stats.scoring_by_par(r))),
    Chart("round_trends", "score_type_distribution_per_round", plot_score_type_distribution_per_round,
          lambda r: any(row["holes_counted"] for row in stats.score_type_distribution_per_round(r))),
    Chart("round_trends", "putts_per_round", plot_putts_per_round, _has_round_putt_totals),
    Chart("round_comparison", "putts_comparison", plot_putts_comparison, _has_round_putt_totals),
    Chart("round_trends", "three_putts_per_round", plot_three_putts_per_round, _has_putts),
    Chart("round_trends", "three_putt_percentage_per_round", plot_three_putt_percentage_per_round, _has_putts),
    Chart("round_comparison", "three_putts_comparison", plot_three_putts_comparison, _has_putts),
    Chart("round_trends", "putts_per_gir", plot_putts_per_gir, _has_putts_per_gir),
    Chart("round_trends", "putts_per_gir_rate_per_round", plot_putts_per_gir_rate_per_round, _has_putts_per_gir),
    Chart("round_comparison", "putts_per_gir_comparison", plot_putts_per_gir_comparison, _has_putts_per_gir),
    Chart("overall_player", "overall_putts_per_gir", plot_overall_putts_per_gir, _has_putts_per_gir),
    Chart("round_trends", "gir_per_round", plot_gir_per_round, _has_gir),
    Chart("round_comparison", "gir_comparison", plot_gir_comparison, _has_gir),
    Chart("overall_player", "gir_vs_non_gir_score_distribution", plot_gir_vs_non_gir_score_distribution, _has_gir),
    Chart("overall_player", "overall_gir_percentage", plot_overall_gir_percentage, _has_gir),
    Chart("round_trends", "scrambling_per_round", plot_scrambling_per_round, _has_scrambling),
    Chart("round_comparison", "scrambling_comparison", plot_scrambling_comparison, _has_scrambling),
    Chart("course_player", "average_score_relative_to_par_by_hole", plot_average_score_relative_to_par_by_hole,
          lambda r: bool(stats.average_score_relative_to_par_by_hole(r)), course=True),
    Chart("course_player", "gir_percentage_by_hole", plot_gir_percentage_by_hole,
          lambda r: bool(stats.gir_percentage_by_hole(r)), course=True),
    Chart("course_player", "average_putts_by_hole", plot_average_putts_by_hole,
          lambda r: bool(stats.average_putts_by_hole(r)), course=True),
    Chart("course_player", "score_type_distribution_by_hole", plot_score_type_distribution_by_hole,
          lambda r: bool(stats.score_type_distribution_by_hole(r)), course=True),
    Chart("course_player", "course_difficulty_profile_by_hole", plot_course_difficulty_profile_by_hole,
          lambda r: bool(stats.course_difficulty_profile_by_hole(r)), course=True),
    Chart("course_player", "average_score_when_gir_vs_missed", plot_average_score_when_gir_vs_missed,
          lambda r: any(row["holes_counted"] for row in stats.average_score_when_gir_vs_missed(r)), course=True),
    Chart("course_player", "score_variance_by_hole", plot_score_variance_by_hole,
          lambda r: bool(stats.score_variance_by_hole(r)), course=True),
    Chart("course_player", "score_trend_on_this_course", plot_score_trend_on_this_course, _any_complete, course=True),
]


def _primary_course_rounds(rounds: List[Round]) -> Optional[tuple[str, List[Round]]]:
    """Rounds on the most-played linked course in the loaded rounds (ties: first seen)."""
    grouped: dict[str, tuple[str, List[Round]]] = {}
    for round_obj in rounds:
        if not round_obj.course:
            continue
        key = round_obj.course.id or round_obj.course.name
        if not key:
            continue
        if key not in grouped:
            grouped[key] = (round_obj.course.name or "Course", [])
        grouped[key][1].append(round_obj)
    if not grouped:
        return None
    _, (course_label, course_rounds) = max(grouped.items(), key=lambda item: len(item[1][1]))
    return course_label, course_rounds


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "player"


def _save(fig, path: Path) -> None:
    """Save then always close the figure, so a failed save doesn't leave it open."""
    from analytics.visualizations import _load_plt

    try:
        fig.savefig(path, dpi=150)
    except Exception as error:
        raise RuntimeError(f"Could not save chart {path.name}: {error}") from error
    finally:
        _load_plt().close(fig)


def export_charts(player_label: str, rounds: List[Round], outdir: Path, *, now: Optional[datetime] = None) -> List[Path]:
    """Write every chart that has data into a new run folder and return the written paths."""
    run_dir = Path(outdir) / _slug(player_label) / (now or datetime.now()).strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True, exist_ok=False)
    rounds = el.chronological(rounds)
    course = _primary_course_rounds(rounds)

    written: List[Path] = []
    for chart in CHARTS:
        chart_rounds = course[1] if chart.course and course else (None if chart.course else rounds)
        if chart_rounds is None or not chart.available(chart_rounds):
            print(f"Skipping {chart.name}: no data for this chart.")
            continue
        figure = chart.plot(chart_rounds, course_label=course[0]) if chart.course else chart.plot(chart_rounds)
        folder = run_dir / chart.folder
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{chart.name}.png"
        _save(figure[0], path)
        written.append(path)
    return written


def _positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive number of rounds")
    return number


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate analytics charts for a player from PostgreSQL data.")
    parser.add_argument("--email", required=True, help="Player email in users.users")
    parser.add_argument("--outdir", default="analytics/output",
                        help="Base directory; each run writes to <outdir>/<player>/<timestamp>/")
    parser.add_argument("--limit", type=_positive_int, default=200, help="Most recent rounds to load (positive)")
    parser.add_argument("--dsn", default=None, help="Optional PostgreSQL DSN. If omitted, uses connection defaults.")
    return parser.parse_args()


async def _load_rounds(email: str, dsn: str | None, limit: int) -> tuple[str, List[Round]]:
    from database.connection import DatabasePool
    from database.db_manager import DatabaseManager

    pool = DatabasePool()
    await pool.initialize(dsn=dsn)
    db = DatabaseManager(pool.pool)
    try:
        user = await db.users.get_user_by_email(email)
        if not user:
            raise RuntimeError(f"No user found for email: {email}")
        rounds = await db.rounds.get_rounds_for_user(user.id, limit=limit)
        if not rounds:
            raise RuntimeError(f"No rounds found for user: {email}")
        return user.name or email, el.chronological(rounds)
    finally:
        await pool.close()


async def main_async() -> None:
    args = _parse_args()
    player_label, rounds = await _load_rounds(args.email, args.dsn, args.limit)
    written = export_charts(player_label, rounds, Path(args.outdir))
    print(f"Generated {len(written)} chart(s) for {player_label} from its {len(rounds)} most recent rounds:")
    for path in written:
        print(path.resolve())


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
