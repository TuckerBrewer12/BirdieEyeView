import type { RoundComparisonDto } from "@/types/api";
import type { Round } from "@/domain";

export type ComparisonWindow = RoundComparisonDto["windows"][number]["window"];
type ComparisonMetric = RoundComparisonDto["windows"][number]["metrics"][number]["metric"];
type ComparisonVerdict = NonNullable<RoundComparisonDto["windows"][number]["metrics"][number]["verdict"]>;

export const COMPARISON_WINDOWS: readonly { value: ComparisonWindow; label: string }[] = [
  { value: "l5", label: "L5" },
  { value: "l20", label: "L20" },
  { value: "all", label: "All" },
];

const METRIC_LABELS: Record<ComparisonMetric, string> = {
  score: "Score",
  putts: "Putts",
  greens: "Greens hit",
  three_putts: "3-putts",
  putts_per_gir: "Putts / GIR",
  scrambling: "Scrambling",
};

export interface ComparisonRow {
  metric: ComparisonMetric;
  label: string;
  value: number | null;
  average: number | null;
  difference: number;
  verdict: ComparisonVerdict;
  direction: "up" | "down" | "flat";
}

export interface ComparisonWindowRows {
  rounds: number;
  metrics: ComparisonRow[];
}

export function comparisonFrom(dto: RoundComparisonDto): Partial<Record<ComparisonWindow, ComparisonWindowRows>> {
  const windows: Partial<Record<ComparisonWindow, ComparisonWindowRows>> = {};
  for (const window of dto.windows) {
    const metrics: ComparisonRow[] = [];
    for (const metric of window.metrics) {
      if (metric.difference == null || metric.verdict == null) continue;
      metrics.push({
        metric: metric.metric,
        label: METRIC_LABELS[metric.metric],
        value: metric.value,
        average: metric.average,
        difference: metric.difference,
        verdict: metric.verdict,
        direction: metric.difference > 0 ? "up" : metric.difference < 0 ? "down" : "flat",
      });
    }
    windows[window.window] = { rounds: window.rounds, metrics };
  }
  return windows;
}

export interface SummaryFigure {
  label: string;
  value: string;
  unit?: string;
}

export function summaryFigures(round: Round): SummaryFigure[] {
  return [
    {
      label: round.courseHandicap != null ? `Net · hcp ${round.courseHandicap}` : "Net",
      value: round.netScore?.toString() ?? "—",
    },
    { label: "Putts", value: round.putts?.toString() ?? "—" },
    {
      label: "Greens",
      value: round.gir?.toString() ?? "—",
      unit: round.gir != null ? `/${round.holesPlayed}` : undefined,
    },
  ];
}
