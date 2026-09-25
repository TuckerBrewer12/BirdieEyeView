import type { Course, Round } from "@/types/golf";
import type { ComparisonRow, RoundComparison } from "@/types/analytics";

export type CourseEdit =
  | { status: "linked"; course: Course }
  | { status: "custom"; name: string }
  | { status: "picking" };

export type ChartTabKey = "score" | "short_game" | "gir";

export interface ChartTabItem {
  key: ChartTabKey;
  label: string;
}

export interface ComparisonChartItem {
  title: string;
  primaryLabel: string;
  group: ChartTabKey;
  bars: { label: string; value: number | null; sampleSize: number }[];
}

export const CHART_TABS: ChartTabItem[] = [
  { key: "score", label: "Score" },
  { key: "short_game", label: "Short Game" },
  { key: "gir", label: "GIR" },
];

function barsFrom(rows: ComparisonRow[]) {
  return rows.map((row) => ({
    label: row.label,
    value: row.primary_value,
    sampleSize: row.sample_size,
  }));
}

export function chartsFrom(comparison: RoundComparison): ComparisonChartItem[] {
  return [
    { title: "Score", primaryLabel: "score", group: "score", bars: barsFrom(comparison.score) },
    { title: "Putts", primaryLabel: "putts", group: "short_game", bars: barsFrom(comparison.putts) },
    { title: "GIR", primaryLabel: "GIR", group: "gir", bars: barsFrom(comparison.gir) },
    { title: "3-Putts", primaryLabel: "3-putts", group: "short_game", bars: barsFrom(comparison.three_putts) },
    { title: "Putts per GIR", primaryLabel: "putts/GIR", group: "short_game", bars: barsFrom(comparison.putts_per_gir) },
    { title: "Scrambling", primaryLabel: "scramble successes", group: "short_game", bars: barsFrom(comparison.scrambling) },
  ];
}

export function courseEditFromRound(round: Round): CourseEdit {
  if (round.course) return { status: "linked", course: round.course };
  if (round.course_name_played) return { status: "custom", name: round.course_name_played };
  return { status: "picking" };
}

export function teeRatingLabel(
  tee: { course_rating: number | null; slope_rating: number | null } | null | undefined,
): string | null {
  if (tee?.course_rating == null || tee?.slope_rating == null) return null;
  return `${tee.course_rating} / ${tee.slope_rating}`;
}
