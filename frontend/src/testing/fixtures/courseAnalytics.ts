import type { CourseAnalyticsData } from "../../types/analytics";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

export function emptyCourseAnalytics(courseId: string): CourseAnalyticsData {
  return {
    course_id: courseId,
    rounds_played: 0,
    score_trend_on_course: [],
    average_score_relative_to_par_by_hole: [],
    gir_percentage_by_hole: [],
    average_putts_by_hole: [],
    score_type_distribution_by_hole: [],
    course_difficulty_profile_by_hole: [],
    average_score_when_gir_vs_missed: [],
    score_variance_by_hole: [],
  };
}

function hole<T>(build: (hole: number, par: number) => T): T[] {
  return PARS.map((par, i) => build(i + 1, par));
}

/** Four rounds at Half Moon Bay — enough for the score-trend chart and hero stats. */
export const halfMoonBayAnalytics: CourseAnalyticsData = {
  course_id: "course-hmb",
  rounds_played: 4,
  score_trend_on_course: [
    { round_index: 0, round_id: "round-1", date: "2026-03-09T18:00:00.000Z", total_score: 85, to_par: 13 },
    { round_index: 1, round_id: "round-2", date: "2026-05-02T17:00:00.000Z", total_score: 72, to_par: 0 },
    { round_index: 2, round_id: "round-3", date: "2026-06-15T16:00:00.000Z", total_score: 78, to_par: 6 },
    { round_index: 3, round_id: "round-4", date: "2026-08-01T16:00:00.000Z", total_score: 74, to_par: 2 },
  ],
  average_score_relative_to_par_by_hole: hole((hole_number, par) => {
    const average_to_par = hole_number % 3 === 0 ? 0.4 : -0.1;
    return {
      hole_number,
      par,
      average_score: par + average_to_par,
      average_to_par,
      sample_size: 4,
    };
  }),
  gir_percentage_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    gir_hits: hole_number % 2 === 0 ? 3 : 2,
    sample_size: 4,
    gir_percentage: hole_number % 2 === 0 ? 75 : 50,
  })),
  average_putts_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    average_putts: 1.8 + (hole_number % 4) * 0.1,
    sample_size: 4,
  })),
  score_type_distribution_by_hole: hole((hole_number) => ({
    hole_number,
    sample_size: 4,
    eagle: 0,
    birdie: hole_number % 3 === 0 ? 25 : 50,
    par: 25,
    bogey: hole_number % 3 === 0 ? 50 : 25,
    double_bogey: 0,
    triple_bogey: 0,
    quad_bogey: 0,
  })),
  course_difficulty_profile_by_hole: hole((hole_number, par) => {
    const average_to_par = hole_number % 3 === 0 ? 0.4 : -0.1;
    return {
      hole_number,
      par,
      average_score: par + average_to_par,
      average_to_par,
      sample_size: 4,
      difficulty_rank: hole_number,
    };
  }),
  average_score_when_gir_vs_missed: [
    { bucket: "GIR", holes_counted: 36, average_score: 3.8, average_to_par: -0.2 },
    { bucket: "No GIR", holes_counted: 36, average_score: 4.6, average_to_par: 0.6 },
  ],
  score_variance_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    sample_size: 4,
    average_score: par + 0.2,
    score_variance: 0.4,
    score_std_dev: 0.6,
    variance_rank: hole_number,
  })),
};
