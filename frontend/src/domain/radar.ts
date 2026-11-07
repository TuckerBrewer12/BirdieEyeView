import type { BenchmarkShape } from "./benchmark";
import { formatPercent } from "./format";
import { formatAverageToPar } from "./score";

export type RadarEntry = {
  axis: string;
  value: number;
  benchmark: number;
  userRaw: string;
  benchRaw: string;
  hasData: boolean;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Each axis is drawn 0–100 from the centre, further out being better. GIR and scrambling are
// their own percentages. Putts per GIR maps 3.5 → 0 and 1.5 → 100; a par type's average to par
// maps +2 → 0 and −0.5 → 100. A figure the golfer or the comparison has none of sits at the centre.
const percentRadius = (pct: number | null) => clamp(pct ?? 0);
const puttingRadius = (puttsPerGir: number | null) => clamp(((3.5 - (puttsPerGir ?? 3.5)) / 2.0) * 100);
const parRadius = (averageToPar: number | null) => clamp(((2.0 - (averageToPar ?? 2.0)) / 2.5) * 100);

const percentLabel = (pct: number | null) => (pct != null ? formatPercent(pct) : "—");
const puttsLabel = (puttsPerGir: number | null) => (puttsPerGir != null ? `${puttsPerGir.toFixed(2)}/GIR` : "—");
const averageToParLabel = (averageToPar: number | null) =>
  averageToPar != null ? formatAverageToPar(averageToPar) : "—";

interface Axis {
  axis: string;
  figure: keyof BenchmarkShape;
  radius: (value: number | null) => number;
  label: (value: number | null) => string;
}

const AXES: Axis[] = [
  { axis: "GIR", figure: "girPct", radius: percentRadius, label: percentLabel },
  { axis: "Scrambling", figure: "scramblingPct", radius: percentRadius, label: percentLabel },
  { axis: "Putting", figure: "puttsPerGir", radius: puttingRadius, label: puttsLabel },
  { axis: "Par 3s", figure: "par3ToPar", radius: parRadius, label: averageToParLabel },
  { axis: "Par 4s", figure: "par4ToPar", radius: parRadius, label: averageToParLabel },
  { axis: "Par 5s", figure: "par5ToPar", radius: parRadius, label: averageToParLabel },
];

/** The golfer's shape as the server sent it, on the radar, and the comparison's behind it when there is one. */
export function buildRadarData(mine: BenchmarkShape | null, benchmark?: BenchmarkShape | null): RadarEntry[] {
  return AXES.map(({ axis, figure, radius, label }) => ({
    axis,
    value: radius(mine?.[figure] ?? null),
    benchmark: radius(benchmark?.[figure] ?? null),
    userRaw: label(mine?.[figure] ?? null),
    benchRaw: label(benchmark?.[figure] ?? null),
    hasData: mine?.[figure] != null,
  }));
}
