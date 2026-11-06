import type {
  HandicapTrendRowDto,
  ScoreTrendRowDto,
  ScramblingTrendRowDto,
  UpAndDownTrendRowDto,
} from "@/types/api";
import type { DifferentialStatus } from "./handicap";

/** One round on the score and handicap trend. */
export interface RoundTrendPoint {
  roundIndex: number;
  /** Which round this point is, so the server's best round can be found on the trend. */
  roundId: string | null;
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
      roundId: row.round_id,
      score: row.total_score,
      toPar: row.to_par,
      par: row.par,
      rollingAverage: row.rolling_average,
      handicapIndex: handicap?.handicap_index ?? null,
      courseName: row.course_name ?? null,
      differentialStatus: handicap?.differential_status ?? "unrated",
    };
  });
}

/** One round's scrambling and up-and-down rates, in percent. Null where the round had no chance at one. */
export interface ShortGamePoint {
  roundIndex: number;
  roundId: string | null;
  scrambling: number | null;
  upAndDown: number | null;
}

/**
 * The server's scrambling and up-and-down series side by side, paired by round, oldest first.
 * The dashboard and analytics responses both carry them.
 */
export function shortGamePointsFrom(
  scrambling: ScramblingTrendRowDto[],
  upAndDown: UpAndDownTrendRowDto[],
): ShortGamePoint[] {
  const upAndDownByRound = new Map(upAndDown.map((row) => [row.round_index, row.percentage]));
  return scrambling.map((row) => ({
    roundIndex: row.round_index,
    roundId: row.round_id,
    scrambling: row.scrambling_percentage,
    upAndDown: upAndDownByRound.get(row.round_index) ?? null,
  }));
}
