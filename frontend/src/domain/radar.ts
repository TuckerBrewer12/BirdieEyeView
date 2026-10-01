import type { AnalyticsKPIs, ScoringByParRow } from "@/types/analytics";
import type { BenchmarkProfile } from "./benchmark";

export type RadarEntry = {
  axis: string;
  value: number;
  benchmark: number;
  userRaw: string;
  benchRaw: string;
  hasData: boolean;
};

function fmtSign(v: number) {
  return (v >= 0 ? "+" : "") + v.toFixed(1);
}

export function buildRadarData(
  kpis: AnalyticsKPIs,
  scoringByPar: ScoringByParRow[],
  profile?: BenchmarkProfile,
): RadarEntry[] {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const hasGir  = kpis.gir_percentage != null;
  const hasScr  = kpis.scrambling_percentage != null;
  const hasPutt = kpis.putts_per_gir != null;

  const girPct   = kpis.gir_percentage ?? 0;
  const scrPct   = kpis.scrambling_percentage ?? 0;
  const puttsRaw = kpis.putts_per_gir ?? 3.5;

  const p = profile ?? { gir: 0, scrambling: 0, putting: 0, par3: 0, par4: 0, par5: 0 };
  const parRow = (par: number) => scoringByPar.find((r) => r.par === par && r.sample_size > 0);

  const benchPutts = 3.5 - (p.putting * 2.0) / 100;
  const benchPar3  = 2.0 - (p.par3  * 2.5) / 100;
  const benchPar4  = 2.0 - (p.par4  * 2.5) / 100;
  const benchPar5  = 2.0 - (p.par5  * 2.5) / 100;

  return [
    {
      axis: "GIR",
      value: clamp(girPct),
      benchmark: p.gir,
      userRaw: girPct.toFixed(0) + "%",
      benchRaw: p.gir + "%",
      hasData: hasGir,
    },
    {
      axis: "Scrambling",
      value: clamp(scrPct),
      benchmark: p.scrambling,
      userRaw: scrPct.toFixed(0) + "%",
      benchRaw: p.scrambling + "%",
      hasData: hasScr,
    },
    {
      axis: "Putting",
      value: clamp(((3.5 - puttsRaw) / 2.0) * 100),
      benchmark: p.putting,
      userRaw: puttsRaw.toFixed(2) + "/GIR",
      benchRaw: benchPutts.toFixed(2) + "/GIR",
      hasData: hasPutt,
    },
    {
      axis: "Par 3s",
      value: clamp(((2.0 - (parRow(3)?.average_to_par ?? 2.0)) / 2.5) * 100),
      benchmark: p.par3,
      userRaw: parRow(3) ? fmtSign(parRow(3)!.average_to_par) : "—",
      benchRaw: fmtSign(benchPar3),
      hasData: !!parRow(3),
    },
    {
      axis: "Par 4s",
      value: clamp(((2.0 - (parRow(4)?.average_to_par ?? 2.0)) / 2.5) * 100),
      benchmark: p.par4,
      userRaw: parRow(4) ? fmtSign(parRow(4)!.average_to_par) : "—",
      benchRaw: fmtSign(benchPar4),
      hasData: !!parRow(4),
    },
    {
      axis: "Par 5s",
      value: clamp(((2.0 - (parRow(5)?.average_to_par ?? 2.0)) / 2.5) * 100),
      benchmark: p.par5,
      userRaw: parRow(5) ? fmtSign(parRow(5)!.average_to_par) : "—",
      benchRaw: fmtSign(benchPar5),
      hasData: !!parRow(5),
    },
  ];
}
