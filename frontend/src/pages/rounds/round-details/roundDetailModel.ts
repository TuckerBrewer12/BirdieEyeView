import type { RoundComparisonDto } from "@/types/api";
import { formatOneDecimal, formatSigned, formatTwoDecimals } from "@/domain/format";
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

const HUNDREDTHS: ReadonlySet<ComparisonMetric> = new Set(["putts_per_gir"]);

export interface ComparisonRow {
  metric: ComparisonMetric;
  label: string;
  value: string;
  average: string;
  difference: string;
  verdict: ComparisonVerdict;
  direction: "up" | "down" | "flat";
}

export interface ComparisonWindowRows {
  rounds: number;
  rows: ComparisonRow[];
}

function figure(value: number | null, metric: ComparisonMetric, fixed: boolean): string {
  if (value == null) return "—";
  if (HUNDREDTHS.has(metric)) return formatTwoDecimals(value);
  return fixed ? formatOneDecimal(value) : String(value);
}

export function comparisonFrom(dto: RoundComparisonDto): Partial<Record<ComparisonWindow, ComparisonWindowRows>> {
  const windows: Partial<Record<ComparisonWindow, ComparisonWindowRows>> = {};
  for (const window of dto.windows) {
    const rows: ComparisonRow[] = [];
    for (const metric of window.metrics) {
      if (metric.difference == null || metric.verdict == null) continue;
      rows.push({
        metric: metric.metric,
        label: METRIC_LABELS[metric.metric],
        value: figure(metric.value, metric.metric, false),
        average: figure(metric.average, metric.metric, true),
        difference: formatSigned(metric.difference, HUNDREDTHS.has(metric.metric) ? 2 : 1),
        verdict: metric.verdict,
        direction: metric.difference > 0 ? "up" : metric.difference < 0 ? "down" : "flat",
      });
    }
    windows[window.window] = { rounds: window.rounds, rows };
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
