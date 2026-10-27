import { SCORE_KINDS, type ScoreKind } from "@/domain/score";
import type { Round } from "@/domain/round";
import type { RoundTrendPoint } from "@/domain/trend";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import type { MilestoneDto, ScoreMixDto, WhsBreakdownDto } from "@/types/api";

/** Which line the phone's trend card shows. */
export type TrendView = "score" | "handicap";
export type HiTrend = "up" | "down" | "flat";

export function pickBestRound(rounds: Round[]): Round | null {
  const scored = rounds.filter((r) => r.score != null);
  if (!scored.length) return null;
  return scored.reduce((best, curr) => (curr.score! < best.score! ? curr : best));
}

/** The scores of the rounds in the trend, oldest first, skipping rounds without one. */
export function recentScoresFrom(trend: RoundTrendPoint[]): number[] {
  return trend.flatMap((point) => (point.score != null ? [point.score] : []));
}

/** Scrambling and up-and-down rates for the same rounds, oldest first. */
export interface ShortGameTrend {
  scrambling: number[];
  upAndDown: number[];
}

/** The last twelve rounds with both rates, paired by round. Null until there are two to draw. */
export function shortGameTrendFrom(trends: AnalyticsData | null): ShortGameTrend | null {
  if (!trends) return null;
  const upAndDownByRound = new Map(trends.up_and_down_trend.map((row) => [row.round_index, row.percentage]));
  const paired = trends.scrambling_trend
    .filter((row) => upAndDownByRound.has(row.round_index))
    .slice(-12);
  if (paired.length < 2) return null;
  return {
    scrambling: paired.map((row) => row.scrambling_percentage),
    upAndDown: paired.map((row) => upAndDownByRound.get(row.round_index)!),
  };
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

/** A lifetime best the server found, kept as the fact: what kind it is and the number it was set at. */
export interface Milestone {
  kind: MilestoneDto["kind"];
  /** The score for a round under par, the threshold broken for score and putt breaks, the length of a par streak. */
  value: number;
  date: string;
  course: string;
  roundId: string | null;
}

export function milestonesFrom(dtos: MilestoneDto[]): Milestone[] {
  return dtos.map((dto) => ({
    kind: dto.kind,
    value: dto.value,
    date: dto.date,
    course: dto.course,
    roundId: dto.round_id,
  }));
}
