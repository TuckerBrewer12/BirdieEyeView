import type { GoalReportDto, GoalSaverDto } from "@/types/api";
import { goalAttemptsFrom, type GoalAttempt } from "./benchmark";

/** One place to find strokes, in the server's words. */
export interface Saver {
  kind: GoalSaverDto["type"];
  strokesSaved: number;
  /** Percent of the gap to the goal this would close. */
  shareOfGap: number;
  headline: string;
  detail: string;
}

/** Where the golfer stands against their goal, as the server's goal report measured it. */
export interface GoalStanding {
  /** The goal as stored: 79 means breaking 80. */
  target: number;
  average: number | null;
  /** Average minus goal, in strokes a round. Zero or less once the average meets it. */
  gap: number | null;
  progressPct: number | null;
  onTrack: boolean;
  /** The lowest full round in the window, a record: not the round list's best, which goes by to par. */
  lowestScore: number | null;
  /** Rounds in the window at or under the goal. Null before the report loads. */
  roundsMeetingGoal: number | null;
  /** Each scored round in the window, oldest first, marked met or not. Empty before the report loads. */
  attempts: GoalAttempt[];
  /** Biggest saving first, as the server ranked them. */
  savers: Saver[];
}

/**
 * The dashboard's goal card and The Lab both read the goal report through this. Null until the
 * golfer sets a goal. Before the report loads, the goal stands with no figures.
 */
export function goalStandingFrom(
  target: number | null | undefined,
  report: GoalReportDto | null | undefined,
): GoalStanding | null {
  if (target == null) return null;
  return {
    target,
    average: report?.scoring_average ?? null,
    gap: report?.gap ?? null,
    progressPct: report?.progress_pct ?? null,
    onTrack: report?.on_track ?? false,
    lowestScore: report?.lowest_score ?? null,
    roundsMeetingGoal: report?.rounds_meeting_goal ?? null,
    attempts: goalAttemptsFrom(report?.attempts ?? []),
    savers: (report?.savers ?? []).map((saver) => ({
      kind: saver.type,
      strokesSaved: saver.strokes_saved,
      shareOfGap: saver.percentage_of_gap,
      headline: saver.headline,
      detail: saver.detail,
    })),
  };
}
