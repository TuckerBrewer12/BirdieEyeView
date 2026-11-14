import { formatOneDecimal } from "./format";
import type { HandicapTrendRowDto, ScoreTrendRowDto } from "@/types/api";
import type { DifferentialStatus } from "./handicap";

/** One round on the score and handicap trend. */
export interface RoundTrendPoint {
  roundIndex: number;
  score: number | null;
  toPar: number | null;
  /** The par the round's to par reads against: the holes played. */
  par: number | null;
  /** The average over this round and the four before it, as the server worked it. */
  rollingAverage: number | null;
  /** The index after this round. Null until there are enough rounds to have one. */
  handicapIndex: number | null;
  courseName: string | null;
  /** Where the round's differential stands in the WHS window, as the server read it. */
  differentialStatus: DifferentialStatus;
  /** The round falls in the records' last year, as the server counts it. */
  inWindow: boolean;
}

/** The two per-round series the dashboard and analytics responses both carry. */
export interface ScoreAndHandicapTrends {
  score_trend: ScoreTrendRowDto[];
  handicap_trend: HandicapTrendRowDto[];
}

/**
 * The server's score and handicap trends, side by side, oldest first.
 * They pair by position: the handicap trend is cut from a longer history, so its
 * round numbers can run ahead of the score trend's.
 */
export function trendPointsFrom(trends: ScoreAndHandicapTrends | null): RoundTrendPoint[] {
  if (!trends) return [];
  return trends.score_trend.map((row, i) => {
    const handicap = trends.handicap_trend[i];
    return {
      roundIndex: row.round_index,
      score: row.total_score,
      toPar: row.to_par,
      par: row.par,
      rollingAverage: row.rolling_average,
      handicapIndex: handicap?.handicap_index ?? null,
      courseName: row.course_name ?? null,
      differentialStatus: handicap?.differential_status ?? "unrated",
      inWindow: handicap?.in_window ?? false,
    };
  });
}

/** The dashed line across a trend: an average, labelled "Avg 84.2". None without one. */
export interface AverageLine {
  value: number;
  label: string;
}

export function averageLine(
  average: number | null | undefined,
  format: (value: number) => string = formatOneDecimal,
): AverageLine | null {
  return average != null ? { value: average, label: `Avg ${format(average)}` } : null;
}

/** A figure's move: which way, and how far, unsigned. No move, or none at all, shows nothing. */
export interface Move {
  direction: "up" | "down" | null;
  amount: string;
}

export function moveOf(change: number | null | undefined, format: (value: number) => string = formatOneDecimal): Move {
  if (change == null || change === 0) return { direction: null, amount: "" };
  return { direction: change < 0 ? "down" : "up", amount: format(Math.abs(change)) };
}
