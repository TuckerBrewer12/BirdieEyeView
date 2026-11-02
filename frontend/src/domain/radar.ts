import type { AnalyticsKpisDto, ScoringByParRowDto } from "@/types/api";
import type { BenchmarkProfile } from "./benchmark";
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

// Each axis is scored 0–100, further out being better. GIR and scrambling are their own
// percentages. Putts per GIR maps 3.5 → 0 and 1.5 → 100; a par type's average to par
// maps +2 → 0 and −0.5 → 100.
const puttingScore = (puttsPerGir: number) => clamp(((3.5 - puttsPerGir) / 2.0) * 100);
const parScore = (averageToPar: number) => clamp(((2.0 - averageToPar) / 2.5) * 100);

/** The average to par a profile's 0–100 par-type score stands for: the inverse of the radar's scale. */
export function profileAverageToPar(score: number): number {
  return 2.0 - (score * 2.5) / 100;
}

/** The putts per GIR a profile's 0–100 putting score stands for. */
export function profilePuttsPerGir(score: number): number {
  return 3.5 - (score * 2.0) / 100;
}

/**
 * A golfer's own figures on the benchmark scale, so a friend can be drawn the way a
 * handicap benchmark is. Null until they have a round.
 */
export function benchmarkProfileFrom(
  kpis: AnalyticsKpisDto,
  scoringByPar: ScoringByParRowDto[],
): BenchmarkProfile | null {
  if (kpis.total_rounds < 1) return null;
  const parAverage = (par: number) =>
    scoringByPar.find((row) => row.par === par && row.sample_size > 0)?.average_to_par ?? 2;
  return {
    gir: clamp(kpis.gir_percentage ?? 0),
    scrambling: clamp(kpis.scrambling_percentage ?? 0),
    putting: puttingScore(kpis.putts_per_gir ?? 3.5),
    par3: parScore(parAverage(3)),
    par4: parScore(parAverage(4)),
    par5: parScore(parAverage(5)),
  };
}

export function buildRadarData(
  kpis: AnalyticsKpisDto,
  scoringByPar: ScoringByParRowDto[],
  profile?: BenchmarkProfile,
): RadarEntry[] {
  const hasGir  = kpis.gir_percentage != null;
  const hasScr  = kpis.scrambling_percentage != null;
  const hasPutt = kpis.putts_per_gir != null;

  const girPct   = kpis.gir_percentage ?? 0;
  const scrPct   = kpis.scrambling_percentage ?? 0;
  const puttsRaw = kpis.putts_per_gir ?? 3.5;

  const p = profile ?? { gir: 0, scrambling: 0, putting: 0, par3: 0, par4: 0, par5: 0 };
  const parRow = (par: number) => scoringByPar.find((r) => r.par === par && r.sample_size > 0);

  const benchPutts = profilePuttsPerGir(p.putting);
  const benchPar3  = profileAverageToPar(p.par3);
  const benchPar4  = profileAverageToPar(p.par4);
  const benchPar5  = profileAverageToPar(p.par5);

  return [
    {
      axis: "GIR",
      value: clamp(girPct),
      benchmark: p.gir,
      userRaw: formatPercent(girPct),
      benchRaw: formatPercent(p.gir),
      hasData: hasGir,
    },
    {
      axis: "Scrambling",
      value: clamp(scrPct),
      benchmark: p.scrambling,
      userRaw: formatPercent(scrPct),
      benchRaw: formatPercent(p.scrambling),
      hasData: hasScr,
    },
    {
      axis: "Putting",
      value: puttingScore(puttsRaw),
      benchmark: p.putting,
      userRaw: puttsRaw.toFixed(2) + "/GIR",
      benchRaw: benchPutts.toFixed(2) + "/GIR",
      hasData: hasPutt,
    },
    {
      axis: "Par 3s",
      value: parScore(parRow(3)?.average_to_par ?? 2.0),
      benchmark: p.par3,
      userRaw: parRow(3) ? formatSignedOneDecimal(parRow(3)!.average_to_par) : "—",
      benchRaw: formatSignedOneDecimal(benchPar3),
      hasData: !!parRow(3),
    },
    {
      axis: "Par 4s",
      value: parScore(parRow(4)?.average_to_par ?? 2.0),
      benchmark: p.par4,
      userRaw: parRow(4) ? formatSignedOneDecimal(parRow(4)!.average_to_par) : "—",
      benchRaw: formatSignedOneDecimal(benchPar4),
      hasData: !!parRow(4),
    },
    {
      axis: "Par 5s",
      value: parScore(parRow(5)?.average_to_par ?? 2.0),
      benchmark: p.par5,
      userRaw: parRow(5) ? formatSignedOneDecimal(parRow(5)!.average_to_par) : "—",
      benchRaw: formatSignedOneDecimal(benchPar5),
      hasData: !!parRow(5),
    },
  ];
}
