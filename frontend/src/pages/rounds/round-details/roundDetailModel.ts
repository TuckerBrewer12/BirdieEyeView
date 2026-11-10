import type { RoundComparisonDto } from "@/types/api";
import type { CourseDto } from "@/types/api";
import { formatOneDecimal } from "@/domain/format";

/** The rounds "vs your average" averages: the last five before this one, the last twenty, or all. */
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

/** Putts per green read to a hundredth; every other figure averages to a tenth. */
const HUNDREDTHS: ReadonlySet<ComparisonMetric> = new Set(["putts_per_gir"]);

/** One row of "vs your average", worded: this round, the average, and the difference coloured by the server's verdict. */
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
  /** How many earlier rounds the window averages. None means there is nothing to compare with. */
  rounds: number;
  rows: ComparisonRow[];
}

function figure(value: number | null, metric: ComparisonMetric, fixed: boolean): string {
  if (value == null) return "—";
  if (HUNDREDTHS.has(metric)) return value.toFixed(2);
  return fixed ? formatOneDecimal(value) : String(value);
}

/** "+2.4", "−2.4" (a true minus), "0.0". */
function signed(value: number, metric: ComparisonMetric): string {
  const digits = HUNDREDTHS.has(metric) ? 2 : 1;
  const amount = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${amount}`;
  if (value < 0) return `−${amount}`;
  return amount;
}

/** Each window's rows, keyed by window. Figures with no average yet are left out. */
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
        difference: signed(metric.difference, metric.metric),
        verdict: metric.verdict,
        direction: metric.difference > 0 ? "up" : metric.difference < 0 ? "down" : "flat",
      });
    }
    windows[window.window] = { rounds: window.rounds, rows };
  }
  return windows;
}

/** The course's tees as the edit mode's chips: each tee's name and its yardage. */
export function teeOptions(course: CourseDto | null): { name: string; yards: number | null }[] {
  const options: { name: string; yards: number | null }[] = [];
  for (const tee of course?.tees ?? []) {
    if (tee.color) options.push({ name: tee.color, yards: tee.total_yardage });
  }
  return options;
}
