import type { CourseAnalyticsDto } from "../../types/api";
import { courseAnalyticsResponse, type CourseHoleStats } from "../fakes/courseAnalyticsResponses";
import { storedRounds } from "./rounds";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

const SAMPLE = 2;

export function emptyCourseAnalytics(courseId: string): CourseAnalyticsDto {
  return courseAnalyticsResponse(courseId, []);
}

function hole<T>(build: (hole: number, par: number) => T): T[] {
  return PARS.map((par, i) => build(i + 1, par));
}

const toParOn = (holeNumber: number) => (holeNumber % 3 === 0 ? 0.5 : -0.5);

const halfMoonBayHoleStats: CourseHoleStats = {
  holes: hole((hole_number, par) => {
    const toPar = toParOn(hole_number);
    const gir_hits = hole_number % 2 === 0 ? 2 : 1;
    return {
      hole_number,
      par,
      sample_size: SAMPLE,
      average_score: par + toPar,
      average_to_par: toPar,
      difficulty_rank: toPar > 0 ? hole_number / 3 : 6 + hole_number - Math.floor(hole_number / 3),
      score_std_dev: 0.5,
      gir_percentage: (gir_hits / SAMPLE) * 100,
      average_putts: 1.5 + (hole_number % 2) * 0.5,
      putts_verdict: hole_number % 2 === 1 ? "neutral" : "good",
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
  hole_to_par_front_nine: -1.5,
  hole_to_par_back_nine: -1.5,
  hole_to_par_total: -3,
  gir_front_nine: (13 / 18) * 100,
  gir_back_nine: (14 / 18) * 100,
  gir_total: (27 / 36) * 100,
};

export const halfMoonBayAnalytics: CourseAnalyticsDto = courseAnalyticsResponse(
  "course-hmb",
  storedRounds,
  halfMoonBayHoleStats,
);

const atHalfMoonBay = storedRounds.filter((round) => round.course?.id === "course-hmb");
const earlierRounds = ["2026-04-19", "2026-04-04", "2026-03-21"].flatMap((day, i) =>
  atHalfMoonBay.slice(i % 2, (i % 2) + 1).map((source) => ({ ...source, id: `round-hmb-${i + 3}`, date: `${day}T18:00:00.000Z` })),
);

export const halfMoonBayFiveRoundsAnalytics: CourseAnalyticsDto = courseAnalyticsResponse(
  "course-hmb",
  [...storedRounds, ...earlierRounds],
  halfMoonBayHoleStats,
);
