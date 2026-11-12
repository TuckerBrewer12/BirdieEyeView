import type { ScoreMix } from "@/domain/score";
import type { DashboardDto, GoalReportDto, WhsBreakdownDto } from "@/types/api";

/** The server's verdict on a figure's move: a score or a handicap falling is good. */
export type ChangeVerdict = NonNullable<DashboardDto["scoring_average_verdict"]>;

/** The best round the player has, as the server picked it: the dashboard's best-round card. */
export interface BestRound {
  roundId: string | null;
  score: number;
  toPar: number | null;
  course: string | null;
  date: string | null;
}

/** Null until there's a scored round. */
export function bestRoundFrom(dto: DashboardDto): BestRound | null {
  if (dto.best_round == null) return null;
  return {
    roundId: dto.best_round_id ?? null,
    score: dto.best_round,
    toPar: dto.best_round_to_par ?? null,
    course: dto.best_round_course ?? null,
    date: dto.best_round_date ?? null,
  };
}

/** The handicap index and how far it moved since the month began. */
export interface HandicapMonth {
  index: number | null;
  /** Null before there's an index from before the 1st. */
  change: number | null;
  verdict: ChangeVerdict | null;
}

export function handicapMonthFrom(dto: DashboardDto): HandicapMonth {
  return {
    index: dto.handicap_index ?? null,
    change: dto.handicap_change.this_month ?? null,
    verdict: dto.handicap_change.this_month_verdict ?? null,
  };
}

/** Whether a mix has any holes in it: a player with no classified holes has none to split. */
export function hasScoreMix(mix: ScoreMix): boolean {
  return Object.values(mix).some((share) => share > 0);
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
  };
}

/** Where the player stands against their scoring goal, as the goal report measured it. */
export interface GoalProgress {
  /** The goal as stored: 79 means breaking 80. */
  target: number;
  /** Null until the goal report loads. */
  progressPct: number | null;
  onTrack: boolean;
}

/** Null until the player has set a goal. */
export function goalProgress(scoringGoal: number | null | undefined, report: GoalReportDto | null): GoalProgress | null {
  if (scoringGoal == null) return null;
  return {
    target: scoringGoal,
    progressPct: report?.progress_pct ?? null,
    onTrack: report?.on_track ?? false,
  };
}
