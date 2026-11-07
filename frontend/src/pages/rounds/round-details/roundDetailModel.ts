import type { ComparisonRowDto, RoundComparisonDto } from "@/types/api";

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

function barsFrom(rows: ComparisonRowDto[]) {
  return rows.map((row) => ({
    label: row.label,
    value: row.primary_value,
    sampleSize: row.sample_size,
  }));
}

export function chartsFrom(comparison: RoundComparisonDto): ComparisonChartItem[] {
  return [
    { title: "Score", primaryLabel: "score", group: "score", bars: barsFrom(comparison.score) },
    { title: "Putts", primaryLabel: "putts", group: "short_game", bars: barsFrom(comparison.putts) },
    { title: "GIR", primaryLabel: "GIR", group: "gir", bars: barsFrom(comparison.gir) },
    { title: "3-Putts", primaryLabel: "3-putts", group: "short_game", bars: barsFrom(comparison.three_putts) },
    { title: "Putts per GIR", primaryLabel: "putts/GIR", group: "short_game", bars: barsFrom(comparison.putts_per_gir) },
    { title: "Scrambling", primaryLabel: "scramble successes", group: "short_game", bars: barsFrom(comparison.scrambling) },
  ];
}
