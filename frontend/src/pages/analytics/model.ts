import { parTypesFrom, scoreMixFrom, type ParTypeComparison, type ScoreMix } from "@/domain";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type {
  AnalyticsDto,
  AnalyticsKpisDto,
  GirVsNonGirRowDto,
  HeadlineFigureDto,
  PeakGameDto,
  ScoringByYardageRowDto,
} from "@/types/api";

export type { AnalyticsFilters };

/** The last 50 rounds at every course: what the page opens on. */
export const DEFAULT_FILTERS: AnalyticsFilters = { limit: 50, timeframe: "all", courseId: "all" };

/** A course narrows the rounds; the round count alone does not. */
export function isFiltered(filters: AnalyticsFilters): boolean {
  return filters.courseId !== "all";
}

/** The page's sections, in the order the tab bar lists them. */
export const ANALYTICS_TABS = ["profile", "scoring", "ball-striking", "putting", "approach"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

/** The section the page opens on. */
export const DEFAULT_TAB: AnalyticsTab = "scoring";

/** A section named in the address (`?tab=profile`), or null for one that isn't. */
export function tabFrom(value: string | null): AnalyticsTab | null {
  return ANALYTICS_TABS.find((tab) => tab === value) ?? null;
}

/** A course the golfer has a round at, for the course menu. */
export interface PlayedCourse {
  id: string;
  name: string | null;
  location: string | null;
}

/** One of the headline figures, as the server worked it out: its value, its move, and its line. */
export type HeadlineFigure = HeadlineFigureDto;

/** A figure each round, oldest first, with the server's five-round average after it. */
export interface RoundSeriesPoint {
  value: number;
  rollingAverage: number | null;
  /** Where the round was played, for the chart's hover card. */
  course: string | null;
}

/** How holes went when the green was hit, and when it was missed. */
export interface GirSplit {
  bucket: GirVsNonGirRowDto["bucket"];
  holes: number;
  mix: ScoreMix;
}

/** One hole handicap's average to par, and whether it is among the golfer's three hardest. */
export interface HoleDifficulty {
  handicap: number;
  averageToPar: number;
  hardest: boolean;
}

/** The par types the approach section can show, in the order its picker lists them. */
export const APPROACH_PARS = [3, 4, 5] as const;
export type ApproachPar = (typeof APPROACH_PARS)[number];

/** One yardage band of one par type: how the golfer scores from there. */
export interface YardageBucket {
  par: number;
  /** The server's band: "350–399". */
  label: string;
  holes: number;
  averageToPar: number;
  girPercent: number | null;
  mix: ScoreMix;
  /** The band of its par the golfer scores worst from. */
  worst: boolean;
}

/** One round's three-putts, and whether the server marked it as costly. */
export interface ThreePuttRound {
  count: number;
  costly: boolean;
}

/** The share of holes taken in one putt or none, two, and three or more. */
export interface PuttsPerHole {
  holes: number;
  oneOrFewer: number;
  two: number;
  threeOrMore: number;
}

/** The golfer's short game beside the tour's. Null where there is no figure. */
export interface ShortGame {
  scrambling: number | null;
  upAndDown: number | null;
  tourScrambling: number | null;
  tourUpAndDown: number | null;
}

/** The analytics page's figures, as the server sent them, shaped for the sections that draw them. */
export interface Analytics {
  kpis: AnalyticsKpisDto;
  roundCount: number;
  /** Scoring, greens, putts, scrambling and three-putts, each with its move and line. */
  headline: HeadlineFigure[];
  scoreTrend: RoundSeriesPoint[];
  /** Rounds the golfer has a net score for. */
  netTrend: RoundSeriesPoint[];
  scoreMix: ScoreMix;
  /** Each par type against the next level's benchmark. */
  parTypes: ParTypeComparison[];
  /** The handicap the par types are held up against; null without an index. */
  benchmarkHandicap: number | null;
  holeDifficulty: HoleDifficulty[];
  /** Rounds with greens recorded. */
  girTrend: RoundSeriesPoint[];
  shortGame: ShortGame;
  girSplit: GirSplit[];
  /** Rounds with putts recorded. */
  puttsTrend: RoundSeriesPoint[];
  puttsPerHole: PuttsPerHole;
  /** Rounds with putts recorded, oldest first. */
  threePutts: ThreePuttRound[];
  yardageBuckets: YardageBucket[];
  peakGame: PeakGameDto | null;
}

function seriesFrom<T>(
  rows: readonly T[],
  value: (row: T) => number | null | undefined,
  rolling: (row: T) => number | null | undefined,
  course: (row: T) => string | null | undefined = () => null,
): RoundSeriesPoint[] {
  return rows.flatMap((row) => {
    const v = value(row);
    return v == null ? [] : [{ value: v, rollingAverage: rolling(row) ?? null, course: course(row) ?? null }];
  });
}

/** The server's yardage bands, in its order: by par, then band. */
export function yardageBucketsFrom(rows: readonly ScoringByYardageRowDto[]): YardageBucket[] {
  return rows.map((row) => ({
    par: row.par,
    label: row.bucket_label,
    holes: row.sample_size,
    averageToPar: row.average_to_par,
    girPercent: row.gir_percentage,
    mix: row.score_mix,
    worst: row.worst,
  }));
}

/** The par the approach section opens on: par 4s if there are any, else the first par with a band. */
export function defaultApproachPar(buckets: readonly YardageBucket[]): ApproachPar {
  return ([4, 3, 5] as const).find((par) => buckets.some((bucket) => bucket.par === par)) ?? 4;
}

/** The page's figures from the server's response. */
export function analyticsFrom(data: AnalyticsDto): Analytics {
  const withPutts = new Set(data.putts_trend.filter((row) => row.total_putts != null).map((row) => row.round_id));
  return {
    kpis: data.kpis,
    roundCount: data.kpis.total_rounds,
    headline: data.headline,
    scoreTrend: seriesFrom(data.score_trend, (r) => r.total_score, (r) => r.rolling_average, (r) => r.course_name),
    netTrend: seriesFrom(data.net_score_trend, (r) => r.net_score, (r) => r.rolling_average, (r) => r.course_name),
    scoreMix: data.score_mix,
    parTypes: parTypesFrom(data.par_types),
    benchmarkHandicap: data.next_level_handicap,
    holeDifficulty: data.scoring_by_handicap.map((row) => ({
      handicap: row.handicap,
      averageToPar: row.average_to_par,
      hardest: row.hardest,
    })),
    girTrend: seriesFrom(data.gir_trend, (r) => r.gir_percentage, (r) => r.rolling_average),
    shortGame: {
      scrambling: data.kpis.scrambling_percentage,
      upAndDown: data.kpis.up_and_down_percentage,
      tourScrambling: data.tour_short_game?.scrambling_percentage ?? null,
      tourUpAndDown: data.tour_short_game?.up_and_down_percentage ?? null,
    },
    girSplit: data.gir_vs_non_gir.map((row) => ({ bucket: row.bucket, holes: row.holes_counted, mix: scoreMixFrom(row) })),
    puttsTrend: seriesFrom(data.putts_trend, (r) => r.total_putts, (r) => r.rolling_average),
    puttsPerHole: {
      holes: data.putts_per_hole.holes,
      oneOrFewer: data.putts_per_hole.one_or_fewer,
      two: data.putts_per_hole.two,
      threeOrMore: data.putts_per_hole.three_or_more,
    },
    threePutts: data.three_putts_trend
      .filter((row) => withPutts.has(row.round_id))
      .map((row) => ({ count: row.three_putt_count, costly: row.costly })),
    yardageBuckets: yardageBucketsFrom(data.scoring_by_yardage),
    peakGame: data.peak_game,
  };
}
