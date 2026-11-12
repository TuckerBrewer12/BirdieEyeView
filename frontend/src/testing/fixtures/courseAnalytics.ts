import type { CourseAnalyticsDto } from "../../types/api";
import { courseAnalyticsResponse, type CourseHoleStats } from "../fakes/courseAnalyticsResponses";
import { storedRounds } from "./rounds";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

/** Two rounds at a hole, so every rate below is out of two. */
const SAMPLE = 2;

export function emptyCourseAnalytics(courseId: string): CourseAnalyticsDto {
  return courseAnalyticsResponse(courseId, []);
}

function hole<T>(build: (hole: number, par: number) => T): T[] {
  return PARS.map((par, i) => build(i + 1, par));
}

/** Every third hole: a par and a bogey. The rest: a birdie and a par. */
const toParOn = (holeNumber: number) => (holeNumber % 3 === 0 ? 0.5 : -0.5);

const halfMoonBayHoleStats: CourseHoleStats = {
  // Two rounds a hole, a stroke apart, so every hole's score swings half a stroke.
  holes: hole((hole_number, par) => {
    const toPar = toParOn(hole_number);
    const gir_hits = hole_number % 2 === 0 ? 2 : 1;
    return {
      hole_number,
      par,
      sample_size: SAMPLE,
      average_score: par + toPar,
      average_to_par: toPar,
      score_std_dev: 0.5,
      gir_percentage: (gir_hits / SAMPLE) * 100,
      average_putts: 1.5 + (hole_number % 2) * 0.5,
      score_mix: {
        eagle: 0,
        birdie: toPar < 0 ? 50 : 0,
        par: 50,
        bogey: toPar > 0 ? 50 : 0,
        double: 0,
        triple: 0,
        quad: 0,
      },
    };
  }),
  // Each nine has three holes half a stroke over and six half a stroke under.
  hole_to_par_front_nine: -1.5,
  hole_to_par_back_nine: -1.5,
  hole_to_par_total: -3,
  // Front: 4 even holes hit twice, 5 odd once, of 18 greens. Back: 5 and 4.
  gir_front_nine: (13 / 18) * 100,
  gir_back_nine: (14 / 18) * 100,
  gir_total: (27 / 36) * 100,
};

/** The player's two stored rounds at Half Moon Bay, as GET /stats/course-analytics sends them. */
export const halfMoonBayAnalytics: CourseAnalyticsDto = courseAnalyticsResponse(
  "course-hmb",
  storedRounds,
  halfMoonBayHoleStats,
);
