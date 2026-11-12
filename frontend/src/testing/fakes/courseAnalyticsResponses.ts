import type { CourseAnalyticsDto, CourseSummaryDto } from "../../types/api";
import { listRanks, summaryResponse, type StoredRound } from "./roundResponses";

/**
 * The fake backend's copy of api/course_analytics_responses.py. The record (count, last played,
 * average and its to par, best, worst) and the history come from the stored rounds, the way
 * `analytics.stats.course_record` works them out. The per-hole rows are taken as given rather than
 * copying analytics/stats.py.
 */

export type CourseHoleStats = Pick<
  CourseAnalyticsDto,
  | "holes"
  | "hole_to_par_front_nine"
  | "hole_to_par_back_nine"
  | "hole_to_par_total"
  | "gir_front_nine"
  | "gir_back_nine"
  | "gir_total"
>;

const NO_HOLE_STATS: CourseHoleStats = {
  holes: [],
  hole_to_par_front_nine: null,
  hole_to_par_back_nine: null,
  hole_to_par_total: null,
  gir_front_nine: null,
  gir_back_nine: null,
  gir_total: null,
};

const mean = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function courseAnalyticsResponse(
  courseId: string,
  stored: StoredRound[],
  holeStats: CourseHoleStats = NO_HOLE_STATS,
): CourseAnalyticsDto {
  const here = stored
    .filter((round) => round.course?.id === courseId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const rounds = here.map((round) => summaryResponse(round));
  // The full rounds, or the nines when there is no full round.
  const full = rounds.filter((round) => round.hole_scores.filter((h) => h.strokes != null).length >= 18);
  const counted = full.length > 0 ? full : rounds;
  const ranks = listRanks(here);
  const first = (key: "best" | "worst") => here.find((_, i) => ranks[i]?.[key] === 1)?.id ?? null;
  const dates = rounds.flatMap((round) => (round.date ? [round.date] : []));

  return {
    course_id: courseId,
    rounds_played: rounds.length,
    last_played: dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null,
    scoring_average: mean(counted.flatMap((round) => (round.total_score != null ? [round.total_score] : []))),
    scoring_average_to_par: mean(counted.flatMap((round) => (round.to_par != null ? [round.to_par] : []))),
    best_round_id: first("best"),
    worst_round_id: first("worst"),
    rounds,
    score_trend: scoreTrend([...counted].reverse()),
    ...holeStats,
  };
}

/** `stats.score_trend_with_rolling_average`: each round oldest first, with its five-round average to a tenth. */
function scoreTrend(rounds: CourseAnalyticsDto["rounds"]): CourseAnalyticsDto["score_trend"] {
  return rounds.map((round, i) => {
    const recent = rounds.slice(Math.max(0, i - 4), i + 1).flatMap((r) => (r.total_score != null ? [r.total_score] : []));
    const average = mean(recent);
    return {
      round_index: i + 1,
      round_id: round.id,
      total_score: round.total_score,
      to_par: round.to_par,
      par: round.total_score != null && round.to_par != null ? round.total_score - round.to_par : null,
      course_name: round.course_name,
      rolling_average: average != null ? Math.round(average * 10) / 10 : null,
    };
  });
}

/** A listed course, carrying the golfer's record there from their stored rounds, as GET /courses sends it. */
export function courseSummaryResponse(
  course: Omit<CourseSummaryDto, "rounds_played" | "scoring_average" | "best_score">,
  stored: StoredRound[] = [],
): CourseSummaryDto {
  const record = courseAnalyticsResponse(course.id, stored);
  const best = record.rounds.find((round) => round.id === record.best_round_id);
  return {
    ...course,
    rounds_played: record.rounds_played,
    scoring_average: record.scoring_average,
    best_score: best?.total_score ?? null,
  };
}
