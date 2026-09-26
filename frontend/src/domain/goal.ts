import type { AnalyticsData, GoalReport } from "@/types/analytics";
import { scoringAvg } from "./stats";

/**
 * How far the player has come from the oldest round in the window toward
 * their scoring goal, 0–100. On track reads as 100; null until there is a
 * goal and a score to measure.
 */
export function goalProgressPct(
  scoringGoal: number | null | undefined,
  goalReport: GoalReport | null,
  trends: AnalyticsData | null,
): number | null {
  if (!scoringGoal) return null;
  const current = goalReport?.scoring_average ?? scoringAvg(trends);
  if (current == null) return null;
  if (goalReport?.on_track) return 100;
  const start = (trends?.score_trend ?? []).find((r) => r.total_score != null)?.total_score;
  if (start == null) return null;
  const range = start - scoringGoal;
  if (range <= 0) return 100;
  return Math.min(100, Math.max(0, ((start - current) / range) * 100));
}

/** Where the player stands against their scoring goal. */
export interface GoalProgress {
  /** The goal as stored: 79 means breaking 80. */
  target: number;
  /** Scoring average the goal report measured, once it has loaded. */
  average: number | null;
  progressPct: number | null;
  onTrack: boolean;
  /** Headline of the saver worth the most strokes. */
  focus: string | null;
}

/** Null until the player has set a goal. */
export function goalProgress(
  scoringGoal: number | null | undefined,
  goalReport: GoalReport | null,
  trends: AnalyticsData | null,
): GoalProgress | null {
  if (scoringGoal == null) return null;
  return {
    target: scoringGoal,
    average: goalReport?.scoring_average ?? null,
    progressPct: goalProgressPct(scoringGoal, goalReport, trends),
    onTrack: goalReport?.on_track ?? false,
    focus: goalReport?.savers[0]?.headline ?? null,
  };
}
