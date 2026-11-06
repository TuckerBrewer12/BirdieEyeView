import type { RoundSummary } from "../../types/golf";

function holeStrip(
  strokes: number[],
  pars: number[],
): NonNullable<RoundSummary["hole_scores_summary"]> {
  return strokes.map((s, i) => ({ h: i + 1, s, p: pars[i] ?? 4 }));
}

const STANDARD_PAR = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

export const populatedRounds: RoundSummary[] = [
  {
    id: "round-1",
    course_id: "course-hmb",
    course_name: "Half Moon Bay",
    course_location: "Half Moon Bay, CA",
    course_par: 72,
    tee_box: "Blue",
    date: "2026-06-15T18:00:00.000Z",
    total_score: 78,
    to_par: 6,
    front_nine: 40,
    back_nine: 38,
    total_putts: 32,
    total_gir: 7,
    fairways_hit: 8,
    notes: null,
    hole_scores_summary: holeStrip(
      [5, 4, 3, 6, 5, 4, 5, 3, 5, 4, 5, 3, 6, 4, 4, 5, 3, 4],
      STANDARD_PAR,
    ),
  },
  {
    id: "round-2",
    course_id: "course-hmb",
    course_name: "Half Moon Bay",
    course_location: "Half Moon Bay, CA",
    course_par: 72,
    tee_box: "White",
    date: "2026-05-02T18:00:00.000Z",
    total_score: 72,
    to_par: 0,
    front_nine: 36,
    back_nine: 36,
    total_putts: 30,
    total_gir: 10,
    fairways_hit: 9,
    notes: null,
    hole_scores_summary: holeStrip(
      [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5],
      STANDARD_PAR,
    ),
  },
  {
    id: "round-3",
    course_id: "course-blue-rock",
    course_name: "Blue Rock",
    course_location: "South Yarmouth, MA",
    course_par: 72,
    tee_box: "Blue",
    date: "2026-04-18T18:00:00.000Z",
    total_score: 69,
    to_par: -3,
    front_nine: 34,
    back_nine: 35,
    total_putts: 28,
    total_gir: 12,
    fairways_hit: 11,
    notes: null,
    hole_scores_summary: holeStrip(
      [4, 3, 3, 4, 4, 4, 4, 2, 5, 4, 4, 3, 4, 4, 4, 4, 3, 6],
      STANDARD_PAR,
    ),
  },
  {
    id: "round-4",
    course_id: null,
    course_name: "Scanned Scorecard",
    course_location: null,
    course_par: 72,
    tee_box: null,
    date: "2026-03-09T18:00:00.000Z",
    total_score: 85,
    to_par: 13,
    front_nine: 43,
    back_nine: 42,
    total_putts: 36,
    total_gir: 4,
    fairways_hit: 5,
    notes: null,
    hole_scores_summary: holeStrip(
      [6, 5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 4, 6, 5, 4, 5, 3, 6],
      STANDARD_PAR,
    ),
  },
];
