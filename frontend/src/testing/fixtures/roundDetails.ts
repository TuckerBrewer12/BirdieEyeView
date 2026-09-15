import type { Course, CourseSummary, HoleScore, Round, RoundSummary } from "../../types/golf";
import type { RoundComparison } from "../../types/analytics";
import { populatedRounds } from "./rounds";

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

export function roundFromSummary(summary: RoundSummary, course: Course | null = null): Round {
  return {
    id: summary.id,
    course,
    tee_box: summary.tee_box,
    date: summary.date,
    hole_scores: (summary.hole_scores_summary ?? []).map((h) => ({
      hole_number: h.h,
      strokes: h.s,
      net_score: null,
      putts: null,
      shots_to_green: null,
      fairway_hit: null,
      green_in_regulation: null,
      par_played: h.p,
      handicap_played: null,
    })),
    weather_conditions: null,
    notes: summary.notes,
    total_putts: summary.total_putts,
    total_gir: summary.total_gir,
    course_name_played: course ? null : summary.course_name,
    user_tee: null,
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

function holeScores(
  strokes: number[],
  pars: number[],
  putts: number[] = strokes.map(() => 2),
): HoleScore[] {
  return strokes.map((s, i) => ({
    hole_number: i + 1,
    strokes: s,
    net_score: null,
    putts: putts[i] ?? null,
    shots_to_green: null,
    fairway_hit: null,
    green_in_regulation: s <= (pars[i] ?? 4) - 2 ? true : s <= (pars[i] ?? 4),
    par_played: pars[i] ?? 4,
    handicap_played: null,
  }));
}

export const halfMoonBayCourse: Course = {
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
};

export const pebbleBeachCourse: Course = {
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
};

const hmbSummary = populatedRounds[0];

export const halfMoonBayRound: Round = {
  id: hmbSummary.id,
  course: halfMoonBayCourse,
  tee_box: "Blue",
  date: hmbSummary.date,
  hole_scores: holeScores(
    [5, 4, 3, 6, 5, 4, 5, 3, 5, 4, 5, 3, 6, 4, 4, 5, 3, 4],
    STANDARD_PAR,
  ),
  weather_conditions: null,
  notes: null,
  total_putts: hmbSummary.total_putts,
  total_gir: hmbSummary.total_gir,
  course_name_played: null,
  user_tee: null,
};

export const scannedRound: Round = {
  id: "round-4",
  course: null,
  tee_box: null,
  date: "2026-03-09T18:00:00.000Z",
  hole_scores: holeScores(
    [6, 5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 4, 6, 5, 4, 5, 3, 6],
    STANDARD_PAR,
  ),
  weather_conditions: null,
  notes: null,
  total_putts: 36,
  total_gir: 4,
  course_name_played: "Scanned Scorecard",
  user_tee: null,
};

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
