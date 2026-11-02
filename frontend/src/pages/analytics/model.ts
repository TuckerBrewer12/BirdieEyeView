import { SCORE_KINDS, scoreKind, type ScoreKind, type ScoreMix } from "@/domain";
import { average, withRollingAverage } from "@/domain/stats";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type {
  AnalyticsDto,
  AnalyticsKpisDto,
  GirTrendRowDto,
  GirVsNonGirRowDto,
  PuttsTrendRowDto,
  ScoreTrendRowDto,
  ScoreTypeRowDto,
  ScoringByParRowDto,
  ScoringByYardageRowDto,
  ScramblingTrendRowDto,
  ThreePuttsTrendRowDto,
  UpAndDownTrendRowDto,
} from "@/types/api";

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

const SCORE_TYPE_KEYS = [
  "eagle",
  "birdie",
  "par",
  "bogey",
  "double_bogey",
  "triple_bogey",
  "quad_bogey",
] as const satisfies readonly (keyof ScoreTypeRowDto)[];
export type ScoreTypeKey = (typeof SCORE_TYPE_KEYS)[number];

/** One score type's share of every counted hole, as a percentage to one decimal. */
export interface ScoreTypeShare {
  name: ScoreTypeKey;
  value: number;
}

/** Where each score kind's share sits on the server's score-type rows. */
const ROW_KEY: Record<ScoreKind, ScoreTypeKey> = {
  eagle: "eagle",
  birdie: "birdie",
  par: "par",
  bogey: "bogey",
  double: "double_bogey",
  triple: "triple_bogey",
  quad: "quad_bogey",
};

/** The round the server found lowest in the window, and where and when it was played. */
export interface BestRoundEvent {
  roundId: string | null;
  course: string;
  date: string;
}

/** How holes went when the green was hit, and when it was missed, as the server split them. */
export interface GirSplit {
  bucket: GirVsNonGirRowDto["bucket"];
  holes: number;
  mix: ScoreMix;
}

/** The par types the range view can show, in the order its picker lists them. */
export const RANGE_PARS = [3, 4, 5] as const;
export type RangePar = (typeof RANGE_PARS)[number];

/** One yardage band of one par type: how the golfer scores from there. */
export interface YardageBucket {
  par: number;
  /** The server's band: "350–399". */
  label: string;
  holes: number;
  /** The par plus the average to par: what the golfer averages there. */
  averageScore: number;
  averageToPar: number;
  girPercent: number | null;
  /** Each hole played in the band, its score to par and yardage. */
  results: { toPar: number; yardage: number }[];
  /** Each score kind's share of the band's holes. */
  mix: ScoreMix;
}

export type ScoreTrendPoint = ScoreTrendRowDto & { rolling_avg: number | null };
export type ShortGamePoint = ScramblingTrendRowDto & { up_and_down_pct: number | null };

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
  /** The server's sections as sent, for the charts that draw a section as it is. */
  sections: AnalyticsDto;
  kpis: AnalyticsKpisDto;
  roundCount: number;
  /** Each round's score with a five-round rolling average, oldest first. */
  scoreTrend: ScoreTrendPoint[];
  /** Score types across every counted hole; types never made are left out. */
  scoreMix: ScoreTypeShare[];
  /** Rounds with greens recorded. */
  girTrend: GirTrendRowDto[];
  /** Some rounds have no greens recorded, so they sit out of `girTrend`. */
  girRoundsLeftOut: boolean;
  /** Rounds with putts recorded. */
  puttsTrend: PuttsTrendRowDto[];
  /** Three-putt counts, only for rounds with putts recorded. */
  threePuttTrend: ThreePuttsTrendRowDto[];
  /** Each round's scrambling rate beside its up-and-down rate. */
  shortGameTrend: ShortGamePoint[];
  bestScore: number | null;
  /** The server's lowest round in the window. */
  bestRound: BestRoundEvent | null;
  /** `scoreMix` keyed by score kind, for the kit's mix bar. */
  scoreMixByKind: ScoreMix;
  girSplit: GirSplit[];
  /** Yardage bands, each par's in the server's order. */
  yardageBuckets: YardageBucket[];
  averagePutts: number | null;
  insights: Insight[];
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function present<T>(value: T | null | undefined): value is T {
  return value != null;
}

/** Each score type's share of every counted hole, weighted by how many holes each round counted. */
export function scoreMixFrom(distribution: ScoreTypeRowDto[]): ScoreTypeShare[] {
  const counted = distribution.filter((row) => row.holes_counted > 0);
  const totalHoles = counted.reduce((sum, row) => sum + row.holes_counted, 0);
  if (totalHoles === 0) return [];
  return SCORE_TYPE_KEYS.map((name) => {
    const holes = counted.reduce((sum, row) => sum + (row[name] / 100) * row.holes_counted, 0);
    return { name, value: Math.round((holes / totalHoles) * 1000) / 10 };
  }).filter((share) => share.value > 0);
}

/** Every score kind, at zero share. */
function emptyMix(): ScoreMix {
  return Object.fromEntries(SCORE_KINDS.map((kind) => [kind, 0])) as ScoreMix;
}

/** The score-type shares keyed by score kind; kinds never made are zero. */
export function scoreMixByKindFrom(shares: ScoreTypeShare[]): ScoreMix {
  const mix = emptyMix();
  for (const kind of SCORE_KINDS) mix[kind] = shares.find((share) => share.name === ROW_KEY[kind])?.value ?? 0;
  return mix;
}

/** The server's GIR and no-GIR rows, keyed by score kind. */
export function girSplitFrom(rows: GirVsNonGirRowDto[]): GirSplit[] {
  return rows.map((row) => {
    const mix = emptyMix();
    for (const kind of SCORE_KINDS) mix[kind] = row[ROW_KEY[kind]];
    return { bucket: row.bucket, holes: row.holes_counted, mix };
  });
}

/** The server's yardage bands, each par's in band order, with each band's holes sorted into score kinds. */
export function yardageBucketsFrom(rows: ScoringByYardageRowDto[]): YardageBucket[] {
  return [...rows]
    .sort((a, b) => a.par - b.par || a.bucket_order - b.bucket_order)
    .map((row) => {
      const results = row.raw_scores.map((score) => ({ toPar: score.to_par, yardage: score.yardage }));
      const mix = emptyMix();
      for (const result of results) mix[scoreKind(result.toPar, 0)!] += 100 / results.length;
      return {
        par: row.par,
        label: row.bucket_label,
        holes: row.sample_size,
        averageScore: row.par + row.average_to_par,
        averageToPar: row.average_to_par,
        girPercent: row.gir_percentage,
        results,
        mix,
      };
    });
}

/** The par the range view opens on: par 4s if there are any, else the first par with a band. */
export function defaultRangePar(buckets: YardageBucket[]): RangePar {
  return ([4, 3, 5] as const).find((par) => buckets.some((bucket) => bucket.par === par)) ?? 4;
}

/** The lowest score in the window, or null without a scored round. */
export function bestScoreFrom(scoreTrend: ScoreTrendRowDto[]): number | null {
  const scores = scoreTrend.map((row) => row.total_score).filter(present);
  return scores.length ? Math.min(...scores) : null;
}

function averagePuttsFrom(puttsTrend: PuttsTrendRowDto[]): number | null {
  return average(puttsTrend.map((row) => row.total_putts).filter(present));
}

/** Pairs each round's scrambling rate with the up-and-down rate the server sent for the same round. */
export function shortGameTrendFrom(scrambling: ScramblingTrendRowDto[], upAndDown: UpAndDownTrendRowDto[]): ShortGamePoint[] {
  return scrambling.map((row, i) => ({ ...row, up_and_down_pct: upAndDown[i]?.percentage ?? null }));
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
  scoreTrend: ScoreTrendRowDto[],
  girTrend: GirTrendRowDto[],
  scoringByPar: ScoringByParRowDto[],
  puttsTrend: PuttsTrendRowDto[],
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
export function analyticsFrom(data: AnalyticsDto): Analytics {
  const girTrend = data.gir_trend.filter((row) => row.gir_percentage != null && row.total_gir != null);
  const puttsTrend = data.putts_trend.filter((row) => row.total_putts != null);
  const roundsWithPutts = new Set(puttsTrend.map((row) => row.round_id));
  const scoreMix = scoreMixFrom(data.score_type_distribution);
  const lowest = data.notable_achievements.scoring_records_events.lifetime.lowest_round;

  return {
    sections: data,
    kpis: data.kpis,
    roundCount: data.kpis.total_rounds,
    scoreTrend: withRollingAverage(data.score_trend, (row) => row.total_score),
    scoreMix,
    girTrend,
    girRoundsLeftOut: girTrend.length < data.gir_trend.length,
    puttsTrend,
    threePuttTrend: data.three_putts_trend.filter((row) => roundsWithPutts.has(row.round_id)),
    shortGameTrend: shortGameTrendFrom(data.scrambling_trend, data.up_and_down_trend),
    bestScore: bestScoreFrom(data.score_trend),
    bestRound: lowest ? { roundId: lowest.round_id, course: lowest.course, date: lowest.date } : null,
    scoreMixByKind: scoreMixByKindFrom(scoreMix),
    girSplit: girSplitFrom(data.gir_vs_non_gir),
    yardageBuckets: yardageBucketsFrom(data.scoring_by_yardage),
    averagePutts: averagePuttsFrom(puttsTrend),
    insights: insightsFrom(data.score_trend, data.gir_trend, data.scoring_by_par, data.putts_trend),
  };
}
