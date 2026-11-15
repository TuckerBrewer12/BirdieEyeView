import { formatOneDecimal } from "./format";
import type { HandicapTrendRowDto, ScoreTrendRowDto } from "@/types/api";
import type { DifferentialStatus } from "./handicap";

export interface RoundTrendPoint {
  roundIndex: number;
  score: number | null;
  toPar: number | null;
  par: number | null;
  rollingAverage: number | null;
  handicapIndex: number | null;
  courseName: string | null;
  differentialStatus: DifferentialStatus;
  inWindow: boolean;
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
      par: row.par,
      rollingAverage: row.rolling_average,
      handicapIndex: handicap?.handicap_index ?? null,
      courseName: row.course_name ?? null,
      differentialStatus: handicap?.differential_status ?? "unrated",
      inWindow: handicap?.in_window ?? false,
    };
  });
}

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

export interface Move {
  direction: "up" | "down" | null;
  amount: string;
}

export function moveOf(change: number | null | undefined, format: (value: number) => string = formatOneDecimal): Move {
  if (change == null || change === 0) return { direction: null, amount: "" };
  return { direction: change < 0 ? "down" : "up", amount: format(Math.abs(change)) };
}
