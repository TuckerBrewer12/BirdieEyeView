import { average, trendDelta, withRollingAverage } from "@/lib/stats";
import type {
  AnalyticsData,
  AnalyticsFilters,
  AnalyticsKPIs,
  GIRTrendRow,
  PuttsTrendRow,
  ScoreTrendRow,
  ScoreTypeRow,
  ScoringByParRow,
  ScramblingRow,
  ThreePuttRow,
  UpAndDownRow,
} from "@/types/analytics";

export type { AnalyticsFilters };

/** The last 50 rounds at every course, all time: what the page opens on. */
export const DEFAULT_FILTERS: AnalyticsFilters = { limit: 50, timeframe: "all", courseId: "all" };

/** A course or a timeframe narrows the rounds; the round count alone does not. */
export function isFiltered(filters: AnalyticsFilters): boolean {
  return filters.courseId !== "all" || filters.timeframe !== "all";
}

/** The phone layout's sections, one open at a time. */
export const ANALYTICS_TABS = ["scoring", "ball-striking", "putting", "profile", "range"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

/** A course the golfer has a round at, for the course filter. */
export interface PlayedCourse {
  id: string;
  name: string | null;
  location: string | null;
}

export const SCORE_TYPE_KEYS = [
  "eagle",
  "birdie",
  "par",
  "bogey",
  "double_bogey",
  "triple_bogey",
  "quad_bogey",
] as const satisfies readonly (keyof ScoreTypeRow)[];
export type ScoreTypeKey = (typeof SCORE_TYPE_KEYS)[number];

/** One score type's share of every counted hole, as a percentage to one decimal. */
export interface ScoreTypeShare {
  name: ScoreTypeKey;
  value: number;
}

export type ScoreTrendPoint = ScoreTrendRow & { rolling_avg: number | null };
export type ShortGamePoint = ScramblingRow & { up_and_down_pct: number | null };

/** A rate over the last five rounds that have one, and how far it moved from the five before. */
export interface RecentRate {
  percent: number | null;
  /** Last five minus the five before; null until there are six rounds with a rate. */
  change: number | null;
}

export type InsightCategory = "scoring" | "gir" | "putting";

/** A fact worth a sentence. `present.ts` words it. */
export type Insight =
  /** Earlier half's scoring average minus the later half's: positive when scores came down. */
  | { kind: "scoring-shift"; strokes: number; rounds: number }
  | { kind: "best-par"; par: number; averageToPar: number; holes: number }
  | { kind: "gir-average"; percent: number }
  /** Later half's GIR% minus the earlier half's: positive when more greens were hit. */
  | { kind: "gir-shift"; points: number }
  | { kind: "putts-average"; putts: number }
  /** Earlier half's putts per round minus the later half's: positive when putts came down. */
  | { kind: "putts-shift"; putts: number };

const INSIGHT_CATEGORY: Record<Insight["kind"], InsightCategory> = {
  "scoring-shift": "scoring",
  "best-par": "scoring",
  "gir-average": "gir",
  "gir-shift": "gir",
  "putts-average": "putting",
  "putts-shift": "putting",
};

export function insightCategory(insight: Insight): InsightCategory {
  return INSIGHT_CATEGORY[insight.kind];
}

/** The analytics page's figures: the server's sections, and the series the charts draw from them. */
export interface Analytics {
  /** The server's sections as sent. The legacy layouts still read some of them directly. */
  sections: AnalyticsData;
  kpis: AnalyticsKPIs;
  roundCount: number;
  /** Each round's score with a five-round rolling average, oldest first. */
  scoreTrend: ScoreTrendPoint[];
  /** Score types across every counted hole; types never made are left out. */
  scoreMix: ScoreTypeShare[];
  /** Rounds with greens recorded. */
  girTrend: GIRTrendRow[];
  /** Some rounds have no greens recorded, so they sit out of `girTrend`. */
  girRoundsLeftOut: boolean;
  /** Rounds with putts recorded. */
  puttsTrend: PuttsTrendRow[];
  /** Three-putt counts, only for rounds with putts recorded. */
  threePuttTrend: ThreePuttRow[];
  /** Each round's scrambling rate beside its up-and-down rate. */
  shortGameTrend: ShortGamePoint[];
  scrambling: RecentRate;
  upAndDown: RecentRate;
  bestScore: number | null;
  averagePutts: number | null;
  insights: Insight[];
}

const RECENT_ROUNDS = 5;

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function present<T>(value: T | null | undefined): value is T {
  return value != null;
}

/** Each score type's share of every counted hole, weighted by how many holes each round counted. */
export function scoreMixFrom(distribution: ScoreTypeRow[]): ScoreTypeShare[] {
  const counted = distribution.filter((row) => row.holes_counted > 0);
  const totalHoles = counted.reduce((sum, row) => sum + row.holes_counted, 0);
  if (totalHoles === 0) return [];
  return SCORE_TYPE_KEYS.map((name) => {
    const holes = counted.reduce((sum, row) => sum + (row[name] / 100) * row.holes_counted, 0);
    return { name, value: Math.round((holes / totalHoles) * 1000) / 10 };
  }).filter((share) => share.value > 0);
}

/** The lowest score in the window, or null without a scored round. */
export function bestScoreFrom(scoreTrend: ScoreTrendRow[]): number | null {
  const scores = scoreTrend.map((row) => row.total_score).filter(present);
  return scores.length ? Math.min(...scores) : null;
}

export function averagePuttsFrom(puttsTrend: PuttsTrendRow[]): number | null {
  return average(puttsTrend.map((row) => row.total_putts).filter(present));
}

/** Pairs each round's scrambling rate with the up-and-down rate the server sent for the same round. */
export function shortGameTrendFrom(scrambling: ScramblingRow[], upAndDown: UpAndDownRow[]): ShortGamePoint[] {
  return scrambling.map((row, i) => ({ ...row, up_and_down_pct: upAndDown[i]?.percentage ?? null }));
}

/** A round without a missed green has no rate, so it sits out of both windows. */
export function recentRateFrom(rates: (number | null)[]): RecentRate {
  const recorded = rates.filter(present);
  return {
    percent: average(recorded.slice(-RECENT_ROUNDS)),
    change: trendDelta(recorded, (rate) => rate, RECENT_ROUNDS),
  };
}

/** Splits a series in half by round and compares the halves' averages: later minus earlier. */
function halvesChange(values: number[]): number | null {
  const mid = Math.floor(values.length / 2);
  const earlier = values.slice(0, mid);
  const later = values.slice(mid);
  if (!earlier.length || !later.length) return null;
  return mean(later) - mean(earlier);
}

export function insightsFrom(
  scoreTrend: ScoreTrendRow[],
  girTrend: GIRTrendRow[],
  scoringByPar: ScoringByParRow[],
  puttsTrend: PuttsTrendRow[],
): Insight[] {
  const insights: Insight[] = [];

  if (scoreTrend.length >= 6) {
    const mid = Math.floor(scoreTrend.length / 2);
    const earlier = scoreTrend.slice(0, mid).map((row) => row.total_score).filter(present);
    const later = scoreTrend.slice(mid).map((row) => row.total_score).filter(present);
    if (earlier.length && later.length) {
      const strokes = mean(earlier) - mean(later);
      if (Math.abs(strokes) >= 0.3) {
        insights.push({ kind: "scoring-shift", strokes, rounds: scoreTrend.length });
      }
    }
  }

  if (scoringByPar.length) {
    const best = [...scoringByPar].sort((a, b) => a.average_to_par - b.average_to_par)[0];
    insights.push({ kind: "best-par", par: best.par, averageToPar: best.average_to_par, holes: best.sample_size });
  }

  const girRates = girTrend.map((row) => row.gir_percentage).filter(present);
  if (girRates.length >= 1) {
    insights.push({ kind: "gir-average", percent: mean(girRates) });
  }
  if (girRates.length >= 4) {
    const points = halvesChange(girRates);
    if (points != null && Math.abs(points) >= 1) insights.push({ kind: "gir-shift", points });
  }

  const putts = puttsTrend.map((row) => row.total_putts).filter(present);
  if (putts.length >= 1) {
    insights.push({ kind: "putts-average", putts: mean(putts) });
  }
  if (putts.length >= 4) {
    const change = halvesChange(putts);
    if (change != null && Math.abs(change) >= 0.5) insights.push({ kind: "putts-shift", putts: -change });
  }

  return insights;
}

/** The page's figures from the server's response. */
export function analyticsFrom(data: AnalyticsData): Analytics {
  const girTrend = data.gir_trend.filter((row) => row.gir_percentage != null && row.total_gir != null);
  const puttsTrend = data.putts_trend.filter((row) => row.total_putts != null);
  const roundsWithPutts = new Set(puttsTrend.map((row) => row.round_id));

  return {
    sections: data,
    kpis: data.kpis,
    roundCount: data.kpis.total_rounds,
    scoreTrend: withRollingAverage(data.score_trend, (row) => row.total_score),
    scoreMix: scoreMixFrom(data.score_type_distribution),
    girTrend,
    girRoundsLeftOut: girTrend.length < data.gir_trend.length,
    puttsTrend,
    threePuttTrend: data.three_putts_trend.filter((row) => roundsWithPutts.has(row.round_id)),
    shortGameTrend: shortGameTrendFrom(data.scrambling_trend, data.up_and_down_trend),
    scrambling: recentRateFrom(data.scrambling_trend.map((row) => row.scrambling_percentage)),
    upAndDown: recentRateFrom(data.up_and_down_trend.map((row) => row.percentage)),
    bestScore: bestScoreFrom(data.score_trend),
    averagePutts: averagePuttsFrom(puttsTrend),
    insights: insightsFrom(data.score_trend, data.gir_trend, data.scoring_by_par, data.putts_trend),
  };
}
