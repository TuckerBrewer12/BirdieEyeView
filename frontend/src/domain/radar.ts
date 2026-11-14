import type { AnalyticsKpisDto, ScoringByParRowDto } from "@/types/api";
import type { BenchmarkShape, BenchmarkVerdict, BenchmarkVerdicts } from "./benchmark";
import { formatPercent, formatSigned, formatTwoDecimals } from "./format";

export type RadarEntry = {
  axis: string;
  value: number;
  benchmark: number;
  userRaw: string;
  benchRaw: string;
  hasData: boolean;
  /** The server's verdict on this axis against the comparison. Null without one. */
  verdict: BenchmarkVerdict | null;
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

// Each axis is drawn 0–100 from the centre, further out being better. GIR and scrambling are
// their own percentages. Putts per GIR maps 3.5 → 0 and 1.5 → 100; a par type's average to par
// maps +2 → 0 and −0.5 → 100. A figure the golfer or the comparison has none of sits at the centre.
const percentRadius = (pct: number | null) => clamp(pct ?? 0);
const puttingRadius = (puttsPerGir: number | null) => clamp(((3.5 - (puttsPerGir ?? 3.5)) / 2.0) * 100);
const parRadius = (averageToPar: number | null) => clamp(((2.0 - (averageToPar ?? 2.0)) / 2.5) * 100);

const percentLabel = (pct: number | null) => (pct != null ? formatPercent(pct) : "—");
const puttsLabel = (puttsPerGir: number | null) => (puttsPerGir != null ? `${formatTwoDecimals(puttsPerGir)}/GIR` : "—");
const averageToParLabel = (averageToPar: number | null) => (averageToPar != null ? formatSigned(averageToPar) : "—");

/** The golfer's own figures, on the radar's axes. */
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
  { axis: "Par 3s", figure: "par3ToPar", radius: parRadius, label: averageToParLabel },
  { axis: "Par 4s", figure: "par4ToPar", radius: parRadius, label: averageToParLabel },
  { axis: "Par 5s", figure: "par5ToPar", radius: parRadius, label: averageToParLabel },
];

/** The golfer's shape on the radar, the comparison's behind it when there is one, and the server's verdict on each axis. */
export function buildRadarData(
  kpis: AnalyticsKpisDto,
  scoringByPar: ScoringByParRowDto[],
  benchmark?: BenchmarkShape | null,
  verdicts?: BenchmarkVerdicts | null,
): RadarEntry[] {
  const mine = shapeOf(kpis, scoringByPar);
  return AXES.map(({ axis, figure, radius, label }) => ({
    axis,
    value: radius(mine[figure]),
    benchmark: radius(benchmark?.[figure] ?? null),
    userRaw: label(mine[figure]),
    benchRaw: label(benchmark?.[figure] ?? null),
    hasData: mine[figure] != null,
    verdict: verdicts?.[figure] ?? null,
  }));
}

/** One axis the golfer is ahead or behind on: both figures in the axis's own terms ("33%", "2.02/GIR"). */
export interface RadarGap {
  axis: string;
  mine: string;
  theirs: string;
  /**
   * How far apart they sit on the radar's 0–100 scale, which puts different measures on one footing:
   * it orders the axes, biggest gap first, and is never shown.
   */
  points: number;
}

/** Where the golfer stands on the radar against the comparison, by the server's verdicts. */
export interface RadarStanding {
  /** Biggest lead first. */
  ahead: RadarGap[];
  /** Biggest deficit first. */
  behind: RadarGap[];
  /** The axes with a verdict. */
  judged: number;
}

/** The axes the server judged ahead or behind, each with both figures, biggest gap first. */
export function radarStanding(entries: readonly RadarEntry[]): RadarStanding {
  const gap = (entry: RadarEntry): RadarGap => ({
    axis: entry.axis,
    mine: entry.userRaw,
    theirs: entry.benchRaw,
    points: entry.value - entry.benchmark,
  });
  const ahead = entries.filter((entry) => entry.verdict === "ahead").map(gap);
  const behind = entries.filter((entry) => entry.verdict === "behind").map(gap);
  return {
    ahead: ahead.sort((a, b) => b.points - a.points),
    behind: behind.sort((a, b) => a.points - b.points),
    judged: entries.filter((entry) => entry.verdict != null).length,
  };
}
