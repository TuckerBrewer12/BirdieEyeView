import type {
  HandicapTrendRowDto,
  ScoreTrendRowDto,
  ScramblingTrendRowDto,
  UpAndDownTrendRowDto,
} from "@/types/api";
import type { DifferentialStatus } from "./handicap";

export interface RoundTrendPoint {
  roundIndex: number;
  score: number | null;
  toPar: number | null;
  handicapIndex: number | null;
  courseName: string | null;
  differentialStatus: DifferentialStatus;
}

export interface ScoreAndHandicapTrends {
  score_trend: ScoreTrendRowDto[];
  handicap_trend: HandicapTrendRowDto[];
}

export function trendPointsFrom(trends: ScoreAndHandicapTrends | null): RoundTrendPoint[] {
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

export interface ShortGamePoint {
  roundIndex: number;
  roundId: string | null;
  scrambling: number | null;
  upAndDown: number | null;
}

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
