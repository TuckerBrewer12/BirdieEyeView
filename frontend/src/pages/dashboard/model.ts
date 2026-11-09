import type { RoundSummary } from "@/domain/round";
import type { ScoreMix } from "@/domain/score";
import type { DashboardDto, DashboardWindowDto, GoalReportDto, MilestoneDto, WhsBreakdownDto } from "@/types/api";

/** How good the putts per round are, as the server rated them. */
export type PuttsRating = NonNullable<DashboardDto["putts_rating"]>;

/** Which stretch of rounds the dashboard measures: the Last 5 / Last 20 switch. */
export type DashboardWindowKey = "last5" | "last20";
/** The server's verdict on a figure's move: a score or a handicap falling is good. */
export type ChangeVerdict = NonNullable<DashboardDto["scoring_average_verdict"]>;

/** The listed round the server picked as the best of them. Null when it picked none. */
export function bestRecentRoundFrom(rounds: RoundSummary[], bestId: string | null | undefined): RoundSummary | null {
  return rounds.find((round) => round.id === bestId) ?? null;
}

/** The dashboard's figures over one window of rounds, as the server worked them out. */
export interface WindowFigures {
  /** How many rounds the window asks for: 5 or 20. */
  size: number;
  /** How many of them have a score. */
  rounds: number;
  scoringAverage: number | null;
  /** Against the last 20's average for the last five, every round's for the last 20. */
  scoringAverageChange: number | null;
  scoringAverageVerdict: ChangeVerdict | null;
  /** The newest index less the window's first. */
  handicapChange: number | null;
  handicapVerdict: ChangeVerdict | null;
  scramblingPct: number | null;
  upAndDownPct: number | null;
  /** Null until the window has a scored hole. */
  scoreMix: ScoreMix | null;
}

export function windowFiguresFrom(dto: DashboardWindowDto): WindowFigures {
  return {
    size: dto.size,
    rounds: dto.rounds,
    scoringAverage: dto.scoring_average,
    scoringAverageChange: dto.scoring_average_change,
    scoringAverageVerdict: dto.scoring_average_verdict,
    handicapChange: dto.handicap_change,
    handicapVerdict: dto.handicap_verdict,
    scramblingPct: dto.scrambling_pct,
    upAndDownPct: dto.up_and_down_pct,
    scoreMix: dto.score_mix_holes > 0 ? dto.score_mix : null,
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
