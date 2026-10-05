import type { CourseAnalyticsDto } from "../../types/api";
import { summaryResponse, type StoredRound } from "./roundResponses";

/**
 * The fake backend's copy of api/course_analytics_responses.py. The rounds-level figures (count,
 * average, best, worst, trend, history) come from the stored rounds, the way the server works
 * them out. The per-hole rows are taken as given rather than copying analytics/stats.py.
 */

export type CourseHoleStats = Omit<
  CourseAnalyticsDto,
  "course_id" | "rounds_played" | "scoring_average" | "best_score" | "worst_score" | "rounds" | "score_trend_on_course"
>;

export const NO_HOLE_STATS: CourseHoleStats = {
  average_score_relative_to_par_by_hole: [],
  gir_percentage_by_hole: [],
  average_putts_by_hole: [],
  score_type_distribution_by_hole: [],
  course_difficulty_profile_by_hole: [],
  average_score_when_gir_vs_missed: [],
  score_variance_by_hole: [],
};

export function courseAnalyticsResponse(
  courseId: string,
  stored: StoredRound[],
  holeStats: CourseHoleStats = NO_HOLE_STATS,
): CourseAnalyticsDto {
  const played = stored
    .filter((round) => round.course?.id === courseId)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .map(summaryResponse);
  const scores = played.map((round) => round.total_score).filter((score): score is number => score != null);

  return {
    course_id: courseId,
    rounds_played: played.length,
    scoring_average: scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
    best_score: scores.length > 0 ? Math.min(...scores) : null,
    worst_score: scores.length > 0 ? Math.max(...scores) : null,
    rounds: [...played].reverse(),
    score_trend_on_course: played.map((round, i) => ({
      round_index: i + 1,
      round_id: round.id,
      date: round.date,
      total_score: round.total_score,
      to_par: round.to_par,
    })),
    ...holeStats,
  };
}
