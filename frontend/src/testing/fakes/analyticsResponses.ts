import type { AnalyticsDto } from "../../types/api";
import { achievementsAYearOn, sampleGolfer } from "../fixtures/sampleGolfer";

export interface AnalyticsSeed {
  analytics: AnalyticsDto;
  byCourse?: Record<string, AnalyticsDto>;
  homeCourseId?: string | null;
}

export function analyticsForCourse(seed: AnalyticsSeed, courseId: string): AnalyticsDto {
  if (courseId === "all") return seed.analytics;
  const resolved = courseId === "home" ? seed.homeCourseId : courseId;
  return (resolved ? seed.byCourse?.[resolved] : undefined) ?? withoutRounds(seed.analytics);
}

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
      average_putts: null,
      three_putts_per_round: null,
      three_putt_rate: null,
      scoring_average_change: null,
    },
    score_trend: [],
    net_score_trend: [],
    gir_trend: [],
    putts_trend: [],
    three_putts_trend: [],
    scrambling_trend: [],
    up_and_down_trend: [],
    scoring_by_par: [],
    scoring_by_yardage: [],
    scoring_by_handicap: [],
    gir_vs_non_gir: [],
    handicap_trend: [],
    score_differentials: [],
    score_mix: { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 },
    insights: [],
    peak_game: null,
    notable_achievements: {
      ...analytics.notable_achievements,
      scoring_records: {
        lifetime: { ...analytics.notable_achievements.scoring_records.lifetime, lowest_round: null },
        one_year: { ...analytics.notable_achievements.scoring_records.one_year, lowest_round: null },
      },
      scoring_records_events: {
        lifetime: { ...analytics.notable_achievements.scoring_records_events.lifetime, lowest_round: null },
        one_year: { ...analytics.notable_achievements.scoring_records_events.one_year, lowest_round: null },
      },
    },
  };
}

export const sampleAnalyticsAYearOn: AnalyticsDto = {
  ...sampleGolfer.analytics,
  notable_achievements: achievementsAYearOn,
};
