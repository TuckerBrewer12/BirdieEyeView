import type { RoundSummary } from "@/domain/round";
import type { RoundTrendPoint, ShortGamePoint } from "@/domain/trend";
import type { GoalReportDto, MilestoneDto, WhsBreakdownDto } from "@/types/api";

/** Which line the phone's trend card shows. */
export type TrendView = "score" | "handicap";
export type HiTrend = "up" | "down" | "flat";

/** The listed round the server picked as the best of them. Null when it picked none. */
export function bestRecentRoundFrom(rounds: RoundSummary[], bestId: string | null | undefined): RoundSummary | null {
  return rounds.find((round) => round.id === bestId) ?? null;
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

/** The short-game card draws at most this many rounds. */
const SHORT_GAME_ROUNDS = 12;

/**
 * The last twelve rounds with both rates, for the card's two lines. A round without a missed
 * green has no rate, so it drops out of both lines. Null until there are two to draw.
 */
export function recentShortGame(points: ShortGamePoint[]): ShortGameTrend | null {
  const paired = points
    .flatMap((point) =>
      point.scrambling != null && point.upAndDown != null
        ? [{ scrambling: point.scrambling, upAndDown: point.upAndDown }]
        : [],
    )
    .slice(-SHORT_GAME_ROUNDS);
  if (paired.length < 2) return null;
  return {
    scrambling: paired.map((row) => row.scrambling),
    upAndDown: paired.map((row) => row.upAndDown),
  };
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
export function goalProgress(scoringGoal: number | null | undefined, report: GoalReportDto | null): GoalProgress | null {
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
