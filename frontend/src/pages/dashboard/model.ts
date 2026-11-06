import type { RoundSummary } from "@/domain/round";
import type { RoundTrendPoint, ShortGamePoint } from "@/domain/trend";
import type { DashboardDto, GoalReportDto, MilestoneDto, WhsBreakdownDto } from "@/types/api";

export type PuttsRating = NonNullable<DashboardDto["putts_rating"]>;

export type TrendView = "score" | "handicap";
export type HiTrend = "up" | "down" | "flat";

export function bestRecentRoundFrom(rounds: RoundSummary[], bestId: string | null | undefined): RoundSummary | null {
  return rounds.find((round) => round.id === bestId) ?? null;
}

export function recentScoresFrom(trend: RoundTrendPoint[]): number[] {
  return trend.flatMap((point) => (point.score != null ? [point.score] : []));
}

export interface ShortGameTrend {
  scrambling: number[];
  upAndDown: number[];
}

const SHORT_GAME_ROUNDS = 12;

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

export interface GoalProgress {
  target: number;
  average: number | null;
  progressPct: number | null;
  onTrack: boolean;
  focus: string | null;
}

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

export interface Milestone {
  kind: MilestoneDto["kind"];
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
