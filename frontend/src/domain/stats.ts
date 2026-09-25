import type { AnalyticsData, ScoreTypeRow } from "@/types/analytics";
import { SCORE_KINDS, type ScoreKind } from "./score";

/** Analytics payload field → `ScoreKind`. The API still says double_bogey. */
const ANALYTICS_SCORE_FIELDS = {
  eagle: "eagle",
  birdie: "birdie",
  par: "par",
  bogey: "bogey",
  double_bogey: "double",
  triple_bogey: "triple",
  quad_bogey: "quad",
} as const satisfies Record<string, ScoreKind>;

type AnalyticsScoreField = keyof typeof ANALYTICS_SCORE_FIELDS;

export interface ScoreMixItem {
  name: ScoreKind;
  /** Percent of holes, 0–100. */
  value: number;
}

/** Percent of holes at each score kind, weighted by holes played per round. */
export function scoreMix(
  rows: ScoreTypeRow[],
  opts: { roundTenths?: boolean; dropZero?: boolean } = {},
): ScoreMixItem[] {
  if (!rows.length) return [];
  let total = 0;
  const sums: Record<ScoreKind, number> = {
    eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0,
  };
  for (const row of rows) {
    total += row.holes_counted;
    for (const field of Object.keys(ANALYTICS_SCORE_FIELDS) as AnalyticsScoreField[]) {
      sums[ANALYTICS_SCORE_FIELDS[field]] += (row[field] / 100) * row.holes_counted;
    }
  }
  const items = SCORE_KINDS.map((kind) => {
    const raw = total > 0 ? (sums[kind] / total) * 100 : 0;
    return { name: kind, value: opts.roundTenths ? Math.round(raw * 10) / 10 : raw };
  });
  return opts.dropZero ? items.filter((d) => d.value > 0) : items;
}

export function mixHoleCount(rows: ScoreTypeRow[]): number {
  return rows.reduce((s, r) => s + r.holes_counted, 0);
}

/** Average total score over the last `window` scored rounds, or all of them. */
export function scoringAvg(trends: AnalyticsData | null, window?: number): number | null {
  const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
  const slice = window != null ? valid.slice(-window) : valid;
  if (!slice.length) return null;
  return slice.reduce((s, r) => s + r.total_score!, 0) / slice.length;
}

/** Each rate is null when there is nothing to measure it from. */
export interface RecentStats {
  /** Greens in regulation, 0–100. */
  girPct: number | null;
  scramblingPct: number | null;
  upAndDownPct: number | null;
  /** Putts per 18 holes. */
  putts: number | null;
}

/**
 * Short-game and GIR rates over the last `window` rounds, pooled by
 * opportunities rather than averaged per round. GIR falls back to the
 * season KPI and putts to `puttsFallback`, both server figures.
 */
export function recentStats(
  trends: AnalyticsData | null,
  { window = 5, puttsFallback }: { window?: number; puttsFallback?: number | null } = {},
): RecentStats {
  return {
    girPct: girPct(trends, window),
    scramblingPct: rate(
      (trends?.scrambling_trend ?? []).slice(-window),
      (r) => r.scramble_successes,
      (r) => r.scramble_opportunities,
    ),
    upAndDownPct: rate(
      (trends?.up_and_down_trend ?? []).slice(-window),
      (r) => r.successes,
      (r) => r.opportunities,
    ),
    putts: puttsPer18(trends, window, puttsFallback),
  };
}

function rate<T>(rows: T[], successes: (r: T) => number, opportunities: (r: T) => number): number | null {
  const opps = rows.reduce((s, r) => s + opportunities(r), 0);
  const succ = rows.reduce((s, r) => s + successes(r), 0);
  return opps > 0 ? (succ / opps) * 100 : null;
}

function girPct(trends: AnalyticsData | null, window: number): number | null {
  const rows = (trends?.gir_trend ?? [])
    .slice(-window)
    .filter((r) => r.total_gir != null && r.holes_played > 0);
  if (!rows.length) {
    const kpi = trends?.kpis.gir_percentage;
    return kpi != null ? clampPct(kpi) : null;
  }
  const totalGir = rows.reduce((s, r) => s + (r.total_gir ?? 0), 0);
  const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
  return clampPct((totalGir / totalHoles) * 100);
}

function puttsPer18(
  trends: AnalyticsData | null,
  window: number,
  fallback: number | null | undefined,
): number | null {
  const rows = (trends?.putts_trend ?? [])
    .slice(-window)
    .filter((r) => r.total_putts != null && r.holes_played > 0);
  const totalPutts = rows.reduce((s, r) => s + (r.total_putts ?? 0), 0);
  const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
  return totalHoles > 0 ? (totalPutts / totalHoles) * 18 : (fallback ?? null);
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}
