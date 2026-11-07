import { shortGamePointsFrom, type ScoreMix, type ShortGamePoint } from "@/domain";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type {
  AnalyticsDto,
  AnalyticsInsightDto,
  AnalyticsKpisDto,
  AnalyticsScoreTrendRowDto,
  GirTrendRowDto,
  GirVsNonGirRowDto,
  PuttsTrendRowDto,
  ScoringByYardageRowDto,
  ThreePuttsTrendRowDto,
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

/** The server's best round in the window (the round list's Best order), and where it was played. */
export interface BestRoundEvent {
  roundId: string;
  course: string | null;
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
  /** What the golfer averages there. */
  averageScore: number;
  averageToPar: number;
  girPercent: number | null;
  /** Each hole played in the band, its score to par and yardage. */
  results: { toPar: number; yardage: number }[];
  /** Each score kind's share of the band's holes. */
  mix: ScoreMix;
}

/** A round's score, and the server's five-round rolling average under it. */
export type ScoreTrendPoint = AnalyticsScoreTrendRowDto;
export type { ShortGamePoint };

/** A fact the server found worth a sentence, with which way it points. `present.ts` words it. */
export type Insight = AnalyticsInsightDto;
export type InsightCategory = Insight["category"];

/** The analytics page's figures: the server's sections, and the series the charts draw from them. */
export interface Analytics {
  /** The server's sections as sent, for the charts that draw a section as it is. */
  sections: AnalyticsDto;
  kpis: AnalyticsKpisDto;
  roundCount: number;
  /** Each round's score with the server's five-round rolling average, oldest first. */
  scoreTrend: ScoreTrendPoint[];
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
  /** The server's best round's score in the window. */
  bestScore: number | null;
  /** The server's best round in the window. */
  bestRound: BestRoundEvent | null;
  /** Each score kind's share of every counted hole, for the kit's mix bar. */
  scoreMix: ScoreMix;
  girSplit: GirSplit[];
  /** Yardage bands, each par's in the server's order. */
  yardageBuckets: YardageBucket[];
  /** The server's insights: scoring, then greens, then putting. */
  insights: Insight[];
}

/** The server's GIR and no-GIR rows, keyed by score kind. */
export function girSplitFrom(rows: GirVsNonGirRowDto[]): GirSplit[] {
  return rows.map(({ bucket, holes_counted: holes, ...mix }) => ({ bucket, holes, mix }));
}

/** The server's yardage bands, in its order: by par, then band. */
export function yardageBucketsFrom(rows: ScoringByYardageRowDto[]): YardageBucket[] {
  return rows.map((row) => ({
    par: row.par,
    label: row.bucket_label,
    holes: row.sample_size,
    averageScore: row.average_strokes,
    averageToPar: row.average_to_par,
    girPercent: row.gir_percentage,
    results: row.raw_scores.map((score) => ({ toPar: score.to_par, yardage: score.yardage })),
    mix: row.score_mix,
  }));
}

/** The par the range view opens on: par 4s if there are any, else the first par with a band. */
export function defaultRangePar(buckets: YardageBucket[]): RangePar {
  return ([4, 3, 5] as const).find((par) => buckets.some((bucket) => bucket.par === par)) ?? 4;
}

/** The page's figures from the server's response. */
export function analyticsFrom(data: AnalyticsDto): Analytics {
  const girTrend = data.gir_trend.filter((row) => row.gir_percentage != null && row.total_gir != null);
  const puttsTrend = data.putts_trend.filter((row) => row.total_putts != null);
  const roundsWithPutts = new Set(puttsTrend.map((row) => row.round_id));

  return {
    sections: data,
    kpis: data.kpis,
    roundCount: data.kpis.total_rounds,
    scoreTrend: data.score_trend,
    girTrend,
    girRoundsLeftOut: girTrend.length < data.gir_trend.length,
    puttsTrend,
    threePuttTrend: data.three_putts_trend.filter((row) => roundsWithPutts.has(row.round_id)),
    shortGameTrend: shortGamePointsFrom(data.scrambling_trend, data.up_and_down_trend),
    bestScore: data.kpis.best_round ?? null,
    bestRound: data.kpis.best_round_id
      ? { roundId: data.kpis.best_round_id, course: data.kpis.best_round_course ?? null }
      : null,
    scoreMix: data.score_mix,
    girSplit: girSplitFrom(data.gir_vs_non_gir),
    yardageBuckets: yardageBucketsFrom(data.scoring_by_yardage),
    insights: data.insights,
  };
}
