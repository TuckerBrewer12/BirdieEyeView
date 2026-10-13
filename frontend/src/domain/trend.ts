import type { AnalyticsData } from "@/types/analytics";
import type { DifferentialStatus } from "./handicap";

/** One round on the score and handicap trend. */
export interface RoundTrendPoint {
  roundIndex: number;
  score: number | null;
  toPar: number | null;
  /** The index after this round. Null until there are enough rounds to have one. */
  handicapIndex: number | null;
  courseName: string | null;
  /** Where the round's differential stands in the WHS window, as the server read it. */
  differentialStatus: DifferentialStatus;
}

/**
 * The analytics response's score and handicap trends, side by side, oldest first.
 * They pair by position: the handicap trend is cut from a longer history, so its
 * round numbers can run ahead of the score trend's.
 */
export function trendPointsFrom(trends: AnalyticsData | null): RoundTrendPoint[] {
  if (!trends) return [];
  return trends.score_trend.map((row, i) => {
    const handicap = trends.handicap_trend[i];
    return {
      roundIndex: row.round_index,
      score: row.total_score,
      toPar: row.to_par,
      handicapIndex: handicap?.handicap_index ?? null,
      courseName: row.course_name ?? null,
      differentialStatus: handicap?.differential_status ?? "unrated",
    };
  });
}
