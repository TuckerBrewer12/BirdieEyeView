import type { CourseDto, CourseSummaryDto, RoundComparisonDto, RoundDto } from "../../types/api";
import { courseResponse } from "../fakes/courseResponses";
import { roundResponse } from "../fakes/roundResponses";
import { storedRounds } from "./rounds";

export function toCourseSummary(course: CourseDto): CourseSummaryDto {
  if (!course.id) throw new Error("Course needs an id to be a summary.");
  return {
    id: course.id,
    name: course.name,
    location: course.location,
    par: course.par,
    total_holes: course.holes.length,
    tee_count: course.tees.length,
    tees: course.tees.flatMap((tee) => (tee.color ? [tee.color] : [])),
    external_course_id: course.external_course_id,
    source: "local",
    rounds_played: 0,
    scoring_average: null,
    best_score: null,
  };
}

const STANDARD_PAR = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

function holes(pars: number[]) {
  return pars.map((par, i) => ({
    number: i + 1,
    par,
    handicap: i + 1,
  }));
}

export const halfMoonBayCourse: CourseDto = courseResponse({
  id: "course-hmb",
  name: "Half Moon Bay",
  location: "Half Moon Bay, CA",
  par: 72,
  holes: holes(STANDARD_PAR),
  tees: [
    {
      color: "Blue",
      total_yardage: 6500,
      hole_yardages: {},
      slope_rating: 130,
      course_rating: 72.4,
    },
    {
      color: "White",
      total_yardage: 6100,
      hole_yardages: {},
      slope_rating: 122,
      course_rating: 70.1,
    },
  ],
});

export const pebbleBeachCourse: CourseDto = courseResponse({
  id: "course-pebble",
  name: "Pebble Beach",
  location: "Pebble Beach, CA",
  par: 72,
  holes: holes(STANDARD_PAR),
  tees: [
    {
      color: "Blue",
      total_yardage: 6800,
      hole_yardages: {},
      slope_rating: 145,
      course_rating: 75.0,
    },
  ],
});

const [hmbRound, , , scanned] = storedRounds;

export const halfMoonBayRound: RoundDto = roundResponse({ ...hmbRound, course: halfMoonBayCourse });

export const scannedRound: RoundDto = roundResponse(scanned);

function withCourseHandicaps(course: CourseDto, handicaps: number[]): CourseDto {
  return { ...course, tees: course.tees.map((tee, i) => ({ ...tee, course_handicap: handicaps[i] ?? null })) };
}

export const ratedHalfMoonBayCourse: CourseDto = withCourseHandicaps(halfMoonBayCourse, [12, 9]);

export const ratedPebbleBeachCourse: CourseDto = withCourseHandicaps(pebbleBeachCourse, [16]);

export const ratedHalfMoonBayRound: RoundDto = roundResponse({ ...hmbRound, course: ratedHalfMoonBayCourse });

type ComparisonFigureDto = RoundComparisonDto["windows"][number]["metrics"][number];

function figure(
  metric: ComparisonFigureDto["metric"],
  value: number,
  average: number,
  lowerIsBetter: boolean,
): ComparisonFigureDto {
  const digits = metric === "putts_per_gir" ? 100 : 10;
  const difference = Math.round((value - average) * digits) / digits;
  const better = lowerIsBetter ? difference < 0 : difference > 0;
  return { metric, value, average, difference, verdict: difference === 0 ? "neutral" : better ? "good" : "bad" };
}

function window(
  name: RoundComparisonDto["windows"][number]["window"],
  rounds: number,
  [score, putts, greens, threePutts, puttsPerGir, scrambling]: number[],
): RoundComparisonDto["windows"][number] {
  return {
    window: name,
    rounds,
    metrics: [
      figure("score", 78, score, true),
      figure("putts", 32, putts, true),
      figure("greens", 7, greens, false),
      figure("three_putts", 1, threePutts, true),
      figure("putts_per_gir", 1.71, puttsPerGir, true),
      figure("scrambling", 4, scrambling, false),
    ],
  };
}

export const roundComparison: RoundComparisonDto = {
  windows: [
    window("l5", 5, [81.4, 33.6, 5.8, 1.8, 1.9, 3.2]),
    window("l20", 20, [80.4, 33.1, 4.9, 1.9, 1.95, 2.6]),
    window("all", 42, [84.9, 34.8, 4.9, 2.4, 2.1, 2.6]),
  ],
};

export const firstRoundComparison: RoundComparisonDto = {
  windows: (["l5", "l20", "all"] as const).map((name) => ({
    window: name,
    rounds: 0,
    metrics: [{ metric: "score", value: 78, average: null, difference: null, verdict: null }],
  })),
};

const [flowTemplate, , flowBest] = storedRounds;
const FLOW_PAR = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const FLOW_STROKES = [5, 4, 3, 6, 5, 4, 4, 4, 5, 4, 5, 3, 6, 4, 4, 4, 4, 4];

export const overParRound: RoundDto = roundResponse({
  ...flowTemplate,
  hole_scores: flowTemplate.hole_scores.map((hole, i) => ({ ...hole, par_played: FLOW_PAR[i], strokes: FLOW_STROKES[i] })),
});

export const underParRound: RoundDto = roundResponse(flowBest);
