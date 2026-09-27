import type { Course, CourseSummary } from "../../types/golf";
import type { CourseDto, RoundDto } from "../../types/api";
import type { RoundComparison } from "../../types/analytics";
import { roundResponse } from "../fakes/roundResponses";
import { storedRounds } from "./rounds";

export function toCourseSummary(course: Course): CourseSummary {
  if (!course.id) throw new Error("Course needs an id to be a summary.");
  return {
    id: course.id,
    name: course.name,
    location: course.location,
    par: course.par,
    total_holes: course.holes.length,
    tee_count: course.tees.length,
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

export const halfMoonBayCourse: CourseDto = {
  id: "course-hmb",
  name: "Half Moon Bay",
  location: "Half Moon Bay, CA",
  par: 72,
  external_course_id: null,
  user_id: null,
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
};

export const pebbleBeachCourse: CourseDto = {
  id: "course-pebble",
  name: "Pebble Beach",
  location: "Pebble Beach, CA",
  par: 72,
  external_course_id: null,
  user_id: null,
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
};

const [hmbRound, , , scanned] = storedRounds;

/** Round 1 with its full course, as GET /rounds/{id} returns it. */
export const halfMoonBayRound: RoundDto = roundResponse({ ...hmbRound, course: halfMoonBayCourse });

/** Round 4: a scanned card with no linked course. */
export const scannedRound: RoundDto = roundResponse(scanned);

/** Comparison cohorts for a round: this round first, then the baselines. */
export const roundComparison: RoundComparison = {
  score: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 78, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 81.4, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 83.2, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 84.9, secondary_value: null },
  ],
  putts: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 32, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 33.6, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 34.1, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 34.8, secondary_value: null },
  ],
  gir: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 7, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 5.8, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 5.2, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 4.9, secondary_value: null },
  ],
  three_putts: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 1, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 1.8, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 2.1, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 2.4, secondary_value: null },
  ],
  putts_per_gir: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 1.7, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 1.9, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 2.0, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 2.1, secondary_value: null },
  ],
  scrambling: [
    { label: "This round", sample_size: 1, round_id: "round-hmb", primary_value: 4, secondary_value: null },
    { label: "Last 5", sample_size: 5, round_id: null, primary_value: 3.2, secondary_value: null },
    { label: "Last 20", sample_size: 20, round_id: null, primary_value: 2.8, secondary_value: null },
    { label: "All time", sample_size: 42, round_id: null, primary_value: 2.6, secondary_value: null },
  ],
};
