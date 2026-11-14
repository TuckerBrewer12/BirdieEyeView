import { parTypesFrom, scoreMixFrom, type ParTypeComparison, type ScoreCounts, type ScoreKind, type ScoreMix } from "@/domain";
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

export const DEFAULT_FILTERS: AnalyticsFilters = { limit: 50, timeframe: "all", courseId: "all" };

export function isFiltered(filters: AnalyticsFilters): boolean {
  return filters.courseId !== "all";
}

export const ANALYTICS_TABS = ["profile", "scoring", "ball-striking", "putting", "approach"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export const DEFAULT_TAB: AnalyticsTab = "scoring";

export function tabFrom(value: string | null): AnalyticsTab | null {
  return ANALYTICS_TABS.find((tab) => tab === value) ?? null;
}

export interface PlayedCourse {
  id: string;
  name: string | null;
  location: string | null;
}

export type HeadlineFigure = HeadlineFigureDto;

export interface RoundSeriesPoint {
  value: number;
  rollingAverage: number | null;
  course: string | null;
}

export type TrendLine = "score" | ScoreKind;

export type TrendChart = "score" | "greens" | "putts";

export interface TrendWindow {
  shown: number | null;
  onShownChange: (shown: number) => void;
}

export const ALL_ROUNDS_SHOWN: Record<TrendChart, number | null> = { score: null, greens: null, putts: null };

export const DEFAULT_TREND_LINES: TrendLine[] = ["score"];

export interface ScorePoint extends RoundSeriesPoint {
  counts: ScoreCounts | null;
}

export interface GirSplit {
  bucket: GirVsNonGirRowDto["bucket"];
  holes: number;
  mix: ScoreMix;
}

export interface HoleDifficulty {
  handicap: number;
  averageToPar: number;
  hardest: boolean;
}

export const APPROACH_PARS = [3, 4, 5] as const;
export type ApproachPar = (typeof APPROACH_PARS)[number];

export interface YardageBucket {
  par: number;
  label: string;
  holes: number;
  averageToPar: number;
  girPercent: number | null;
  mix: ScoreMix;
  worst: boolean;
}

export interface ThreePuttRound {
  count: number;
  costly: boolean;
}

export interface PuttsPerHole {
  holes: number;
  oneOrFewer: number;
  two: number;
  threeOrMore: number;
}

export interface ShortGame {
  scrambling: number | null;
  upAndDown: number | null;
  tourScrambling: number | null;
  tourUpAndDown: number | null;
}

export interface Analytics {
  kpis: AnalyticsKpisDto;
  roundCount: number;
  headline: HeadlineFigure[];
  scoreTrend: ScorePoint[];
  netTrend: ScorePoint[];
  parTypes: ParTypeComparison[];
  benchmarkHandicap: number | null;
  holeDifficulty: HoleDifficulty[];
  girTrend: RoundSeriesPoint[];
  shortGame: ShortGame;
  girSplit: GirSplit[];
  puttsTrend: RoundSeriesPoint[];
  puttsPerHole: PuttsPerHole;
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

export function defaultApproachPar(buckets: readonly YardageBucket[]): ApproachPar {
  return ([4, 3, 5] as const).find((par) => buckets.some((bucket) => bucket.par === par)) ?? 4;
}

export function analyticsFrom(data: AnalyticsDto): Analytics {
  const countsByRound = new Map(data.score_trend.map((row) => [row.round_id, row.score_counts]));
  const withPutts = new Set(data.putts_trend.filter((row) => row.total_putts != null).map((row) => row.round_id));
  return {
    kpis: data.kpis,
    roundCount: data.kpis.total_rounds,
    headline: data.headline,
    scoreTrend: data.score_trend.flatMap((row) =>
      row.total_score == null
        ? []
        : [{ value: row.total_score, rollingAverage: row.rolling_average, course: row.course_name, counts: row.score_counts }],
    ),
    netTrend: data.net_score_trend.flatMap((row) =>
      row.net_score == null
        ? []
        : [
            {
              value: row.net_score,
              rollingAverage: row.rolling_average ?? null,
              course: row.course_name ?? null,
              counts: countsByRound.get(row.round_id) ?? null,
            },
          ],
    ),
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
