import { SCORE_KINDS, type ScoreKind } from "@/domain/score";
import type { Round } from "@/domain/round";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import type { ScoreMixDto, WhsBreakdownDto } from "@/types/api";

export type TrendView = "score" | "hcp";
export type HiTrend = "up" | "down" | "flat";

export function pickBestRound(rounds: Round[]): Round | null {
  const scored = rounds.filter((r) => r.score != null);
  if (!scored.length) return null;
  return scored.reduce((best, curr) => (curr.score! < best.score! ? curr : best));
}

export interface DualTrendPoint {
  round_index: number;
  total_score: number | null;
  to_par: number | null;
  handicap_index: number | null;
  course_name?: string | null;
  used_in_hi?: boolean | null;
  differential?: number | null;
  hi_threshold?: number | null;
}

export function dualTrendFrom(trends: AnalyticsData | null): DualTrendPoint[] {
  if (!trends) return [];
  return trends.score_trend.map((row, i) => ({
    ...row,
    handicap_index: trends.handicap_trend[i]?.handicap_index ?? null,
    used_in_hi: trends.handicap_trend[i]?.used_in_hi ?? null,
    differential: trends.handicap_trend[i]?.differential ?? null,
    hi_threshold: trends.handicap_trend[i]?.hi_threshold ?? null,
  }));
}

export interface ScoreMixItem {
  name: ScoreKind;
  value: number;
}

/** The server's score mix as chart rows, in bucket order. */
export function scoreMixItems(
  mix: ScoreMixDto,
  opts: { roundTenths?: boolean; dropZero?: boolean } = {},
): ScoreMixItem[] {
  const items = SCORE_KINDS.map((key) => ({
    name: key,
    value: opts.roundTenths ? Math.round(mix[key] * 10) / 10 : mix[key],
  }));
  return opts.dropZero ? items.filter((d) => d.value > 0) : items;
}

export interface WhsRound {
  roundIndex: number;
  courseName: string | null;
  courseRating: number | null;
  slopeRating: number | null;
  score: number | null;
  differential: number | null;
  used: boolean;
}

export interface WhsBreakdown {
  rows: WhsRound[];
  windowSize: number;
  countUsed: number;
  adjustment: number;
  diffAvg: number | null;
  hasRatedRounds: boolean;
  showCalculation: boolean;
}

export function whsFrom(dto: WhsBreakdownDto): WhsBreakdown {
  return {
    rows: dto.rows.map((row) => ({
      roundIndex: row.round_index,
      courseName: row.course_name,
      courseRating: row.course_rating,
      slopeRating: row.slope_rating,
      score: row.score,
      differential: row.differential,
      used: row.used,
    })),
    windowSize: dto.window_size,
    countUsed: dto.count_used,
    adjustment: dto.adjustment,
    diffAvg: dto.diff_avg,
    hasRatedRounds: dto.has_rated_rounds,
    showCalculation: dto.show_calculation,
  };
}

/** Where the player stands against their scoring goal, as the goal report measured it. */
export interface GoalProgress {
  /** The goal as stored: 79 means breaking 80. */
  target: number;
  /** Null until the goal report loads. */
  average: number | null;
  progressPct: number | null;
  onTrack: boolean;
  /** Headline of the saver worth the most strokes. */
  focus: string | null;
}

/** Null until the player has set a goal. */
export function goalProgress(scoringGoal: number | null | undefined, report: GoalReport | null): GoalProgress | null {
  if (scoringGoal == null) return null;
  return {
    target: scoringGoal,
    average: report?.scoring_average ?? null,
    progressPct: report?.progress_pct ?? null,
    onTrack: report?.on_track ?? false,
    focus: report?.savers[0]?.headline ?? null,
  };
}
