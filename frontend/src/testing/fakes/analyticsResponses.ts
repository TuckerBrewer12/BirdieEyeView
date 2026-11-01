import type { AnalyticsDto } from "../../types/api";

/**
 * The fake backend's copy of `GET /stats/analytics/{id}`'s course filter. The figures themselves
 * are taken as given (generated from the real endpoint by scripts/sample_golfer.py), not worked out.
 */
export interface AnalyticsSeed {
  /** Every course's rounds: what "All Courses" answers with. */
  analytics: AnalyticsDto;
  /** A course's own response, keyed by course id. */
  byCourse?: Record<string, AnalyticsDto>;
  homeCourseId?: string | null;
}

/** The response for `course_id` ("all", "home" or an id). A course with no rounds answers empty. */
export function analyticsForCourse(seed: AnalyticsSeed, courseId: string): AnalyticsDto {
  if (courseId === "all") return seed.analytics;
  const resolved = courseId === "home" ? seed.homeCourseId : courseId;
  return (resolved ? seed.byCourse?.[resolved] : undefined) ?? withoutRounds(seed.analytics);
}

/** What the server sends when no round matches the filters: every series empty, no figures. */
export function withoutRounds(analytics: AnalyticsDto): AnalyticsDto {
  return {
    ...analytics,
    kpis: {
      scoring_average: null,
      gir_percentage: null,
      putts_per_gir: null,
      scrambling_percentage: null,
      up_and_down_percentage: null,
      handicap_index: analytics.kpis.handicap_index,
      total_rounds: 0,
    },
    score_trend: [],
    net_score_trend: [],
    gir_trend: [],
    putts_trend: [],
    three_putts_trend: [],
    scrambling_trend: [],
    up_and_down_trend: [],
    score_type_distribution: [],
    scoring_by_par: [],
    scoring_by_yardage: [],
    scoring_by_handicap: [],
    gir_vs_non_gir: [],
    handicap_trend: [],
    score_differentials: [],
    // No round, so no lowest one. The best round's card reads this event.
    notable_achievements: {
      ...analytics.notable_achievements,
      scoring_records_events: {
        lifetime: { ...analytics.notable_achievements.scoring_records_events.lifetime, lowest_round: null },
        one_year: { ...analytics.notable_achievements.scoring_records_events.one_year, lowest_round: null },
      },
    },
  };
}
