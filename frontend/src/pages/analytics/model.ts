import { scoreMixFrom, shortGamePointsFrom, type ScoreMix, type ShortGamePoint } from "@/domain";
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

export const DEFAULT_FILTERS: AnalyticsFilters = { limit: 50, timeframe: "all", courseId: "all" };

export function isFiltered(filters: AnalyticsFilters): boolean {
  return filters.courseId !== "all" || filters.timeframe !== "all";
}

export const ANALYTICS_TABS = ["scoring", "ball-striking", "putting", "profile", "range"] as const;
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export interface PlayedCourse {
  id: string;
  name: string | null;
  location: string | null;
}

export interface BestRoundEvent {
  roundId: string | null;
  course: string;
  date: string;
}

export interface GirSplit {
  bucket: GirVsNonGirRowDto["bucket"];
  holes: number;
  mix: ScoreMix;
}

export const RANGE_PARS = [3, 4, 5] as const;
export type RangePar = (typeof RANGE_PARS)[number];

export interface YardageBucket {
  par: number;
  label: string;
  holes: number;
  averageScore: number;
  averageToPar: number;
  girPercent: number | null;
  results: { toPar: number; yardage: number }[];
  mix: ScoreMix;
}

export type ScoreTrendPoint = AnalyticsScoreTrendRowDto;
export type { ShortGamePoint };

export type Insight = AnalyticsInsightDto;
export type InsightCategory = Insight["category"];

export interface Analytics {
  sections: AnalyticsDto;
  kpis: AnalyticsKpisDto;
  roundCount: number;
  scoreTrend: ScoreTrendPoint[];
  girTrend: GirTrendRowDto[];
  girRoundsLeftOut: boolean;
  puttsTrend: PuttsTrendRowDto[];
  threePuttTrend: ThreePuttsTrendRowDto[];
  shortGameTrend: ShortGamePoint[];
  bestScore: number | null;
  bestRound: BestRoundEvent | null;
  scoreMix: ScoreMix;
  girSplit: GirSplit[];
  yardageBuckets: YardageBucket[];
  insights: Insight[];
}

export function girSplitFrom(rows: GirVsNonGirRowDto[]): GirSplit[] {
  return rows.map((row) => ({
    bucket: row.bucket,
    holes: row.holes_counted,
    mix: scoreMixFrom(row),
  }));
}

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

export function defaultRangePar(buckets: YardageBucket[]): RangePar {
  return ([4, 3, 5] as const).find((par) => buckets.some((bucket) => bucket.par === par)) ?? 4;
}

export function analyticsFrom(data: AnalyticsDto): Analytics {
  const girTrend = data.gir_trend.filter((row) => row.gir_percentage != null && row.total_gir != null);
  const puttsTrend = data.putts_trend.filter((row) => row.total_putts != null);
  const roundsWithPutts = new Set(puttsTrend.map((row) => row.round_id));
  const lowest = data.notable_achievements.scoring_records_events.lifetime.lowest_round;

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
    bestScore: data.notable_achievements.scoring_records.lifetime.lowest_round ?? null,
    bestRound: lowest ? { roundId: lowest.round_id, course: lowest.course, date: lowest.date } : null,
    scoreMix: data.score_mix,
    girSplit: girSplitFrom(data.gir_vs_non_gir),
    yardageBuckets: yardageBucketsFrom(data.scoring_by_yardage),
    insights: data.insights,
  };
}
