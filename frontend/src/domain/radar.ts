import type { AnalyticsKpisDto, ScoringByParRowDto } from "@/types/api";
import type { BenchmarkShape } from "./benchmark";
import { formatPercent, formatSignedOneDecimal } from "./format";

export type RadarEntry = {
  axis: string;
  value: number;
  benchmark: number;
  userRaw: string;
  benchRaw: string;
  hasData: boolean;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

const percentRadius = (pct: number | null) => clamp(pct ?? 0);
const puttingRadius = (puttsPerGir: number | null) => clamp(((3.5 - (puttsPerGir ?? 3.5)) / 2.0) * 100);
const parRadius = (averageToPar: number | null) => clamp(((2.0 - (averageToPar ?? 2.0)) / 2.5) * 100);

const percentLabel = (pct: number | null) => (pct != null ? formatPercent(pct) : "—");
const puttsLabel = (puttsPerGir: number | null) => (puttsPerGir != null ? `${puttsPerGir.toFixed(2)}/GIR` : "—");
const toParLabel = (averageToPar: number | null) => (averageToPar != null ? formatSignedOneDecimal(averageToPar) : "—");

function shapeOf(kpis: AnalyticsKpisDto, scoringByPar: ScoringByParRowDto[]): BenchmarkShape {
  const parAverage = (par: number) =>
    scoringByPar.find((row) => row.par === par && row.sample_size > 0)?.average_to_par ?? null;
  return {
    girPct: kpis.gir_percentage,
    scramblingPct: kpis.scrambling_percentage,
    puttsPerGir: kpis.putts_per_gir,
    par3ToPar: parAverage(3),
    par4ToPar: parAverage(4),
    par5ToPar: parAverage(5),
  };
}

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
  { axis: "Par 3s", figure: "par3ToPar", radius: parRadius, label: toParLabel },
  { axis: "Par 4s", figure: "par4ToPar", radius: parRadius, label: toParLabel },
  { axis: "Par 5s", figure: "par5ToPar", radius: parRadius, label: toParLabel },
];

export function buildRadarData(
  kpis: AnalyticsKpisDto,
  scoringByPar: ScoringByParRowDto[],
  benchmark?: BenchmarkShape | null,
): RadarEntry[] {
  const mine = shapeOf(kpis, scoringByPar);
  return AXES.map(({ axis, figure, radius, label }) => ({
    axis,
    value: radius(mine[figure]),
    benchmark: radius(benchmark?.[figure] ?? null),
    userRaw: label(mine[figure]),
    benchRaw: label(benchmark?.[figure] ?? null),
    hasData: mine[figure] != null,
  }));
}
