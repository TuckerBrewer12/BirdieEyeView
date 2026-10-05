import type { CourseAnalyticsData } from "../../types/analytics";
import { courseAnalyticsResponse, type CourseHoleStats } from "../fakes/courseAnalyticsResponses";
import { storedRounds } from "./rounds";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

/** Two rounds at a hole, so every rate below is out of two. */
const SAMPLE = 2;

export function emptyCourseAnalytics(courseId: string): CourseAnalyticsData {
  return courseAnalyticsResponse(courseId, []);
}

function hole<T>(build: (hole: number, par: number) => T): T[] {
  return PARS.map((par, i) => build(i + 1, par));
}

/** Every third hole: a par and a bogey. The rest: a birdie and a par. */
const toParOn = (holeNumber: number) => (holeNumber % 3 === 0 ? 0.5 : -0.5);

const halfMoonBayHoleStats: CourseHoleStats = {
  average_score_relative_to_par_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    average_score: par + toParOn(hole_number),
    average_to_par: toParOn(hole_number),
    sample_size: SAMPLE,
  })),
  gir_percentage_by_hole: hole((hole_number, par) => {
    const gir_hits = hole_number % 2 === 0 ? 2 : 1;
    return { hole_number, par, gir_hits, sample_size: SAMPLE, gir_percentage: (gir_hits / SAMPLE) * 100 };
  }),
  average_putts_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    average_putts: 1.5 + (hole_number % 2) * 0.5,
    sample_size: SAMPLE,
  })),
  score_type_distribution_by_hole: hole((hole_number) => ({
    hole_number,
    sample_size: SAMPLE,
    eagle: 0,
    birdie: hole_number % 3 === 0 ? 0 : 50,
    par: 50,
    bogey: hole_number % 3 === 0 ? 50 : 0,
    double_bogey: 0,
    triple_bogey: 0,
    quad_bogey: 0,
  })),
  course_difficulty_profile_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    average_score: par + toParOn(hole_number),
    average_to_par: toParOn(hole_number),
    sample_size: SAMPLE,
    difficulty_rank: hole_number,
  })),
  average_score_when_gir_vs_missed: [
    { bucket: "GIR", holes_counted: 27, average_score: 3.8, average_to_par: -0.2 },
    { bucket: "No GIR", holes_counted: 9, average_score: 4.6, average_to_par: 0.6 },
  ],
  score_variance_by_hole: hole((hole_number, par) => ({
    hole_number,
    par,
    sample_size: SAMPLE,
    average_score: par + toParOn(hole_number),
    score_variance: 0.25,
    score_std_dev: 0.5,
    variance_rank: hole_number,
  })),
};

/** The player's two stored rounds at Half Moon Bay, as GET /stats/course-analytics sends them. */
export const halfMoonBayAnalytics: CourseAnalyticsData = courseAnalyticsResponse(
  "course-hmb",
  storedRounds,
  halfMoonBayHoleStats,
);
