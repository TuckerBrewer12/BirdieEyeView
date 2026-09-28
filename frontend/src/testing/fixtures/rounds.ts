import type { RoundSummary } from "../../types/golf";

const STANDARD_PAR = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

type SummaryMeta = Omit<
  RoundSummary,
  "total_score" | "to_par" | "front_nine" | "back_nine" | "hole_scores_summary"
>;

function nine(strokes: number[]): number | null {
  return strokes.length === 9 ? strokes.reduce((sum, s) => sum + s, 0) : null;
}

/** A summary whose stored figures are computed from its holes, the way the round list query does. */
function summary(meta: SummaryMeta, strokes: number[], pars: number[] = STANDARD_PAR): RoundSummary {
  const total = strokes.reduce((sum, s) => sum + s, 0);
  return {
    ...meta,
    total_score: total,
    to_par: meta.course_par != null ? total - meta.course_par : null,
    front_nine: nine(strokes.slice(0, 9)),
    back_nine: nine(strokes.slice(9, 18)),
    hole_scores_summary: strokes.map((s, i) => ({ h: i + 1, s, p: pars[i] ?? 4 })),
  };
}

export const populatedRounds: RoundSummary[] = [
  summary(
    {
      id: "round-1",
      course_id: "course-hmb",
      course_name: "Half Moon Bay",
      course_location: "Half Moon Bay, CA",
      course_par: 72,
      tee_box: "Blue",
      date: "2026-06-15T18:00:00.000Z",
      total_putts: 32,
      total_gir: 7,
      fairways_hit: 8,
      notes: null,
    },
    [5, 4, 3, 6, 5, 4, 5, 3, 5, 4, 5, 3, 6, 4, 4, 5, 3, 4],
  ),
  summary(
    {
      id: "round-2",
      course_id: "course-hmb",
      course_name: "Half Moon Bay",
      course_location: "Half Moon Bay, CA",
      course_par: 72,
      tee_box: "White",
      date: "2026-05-02T18:00:00.000Z",
      total_putts: 30,
      total_gir: 10,
      fairways_hit: 9,
      notes: null,
    },
    [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5],
  ),
  summary(
    {
      id: "round-3",
      course_id: "course-blue-rock",
      course_name: "Blue Rock",
      course_location: "South Yarmouth, MA",
      course_par: 72,
      tee_box: "Blue",
      date: "2026-04-18T18:00:00.000Z",
      total_putts: 28,
      total_gir: 12,
      fairways_hit: 11,
      notes: null,
    },
    [4, 3, 3, 4, 4, 4, 4, 2, 5, 4, 4, 3, 4, 4, 4, 4, 3, 6],
  ),
  summary(
    {
      id: "round-4",
      course_id: null,
      course_name: "Scanned Scorecard",
      course_location: null,
      course_par: 72,
      tee_box: null,
      date: "2026-03-09T18:00:00.000Z",
      total_putts: 36,
      total_gir: 4,
      fairways_hit: 5,
      notes: null,
    },
    [5, 5, 4, 6, 5, 4, 5, 3, 6, 5, 5, 4, 6, 5, 4, 5, 3, 5],
  ),
];

/** `count` rounds at different courses, scoring 70, 71, 72… by giving the first holes a shot back or extra. */
export function nRounds(count: number): RoundSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const toPar = i - 2;
    const strokes = STANDARD_PAR.map((par, hole) =>
      hole < Math.abs(toPar) ? par + Math.sign(toPar) : par,
    );
    return summary(
      {
        ...populatedRounds[0],
        id: `round-n-${i + 1}`,
        course_id: `course-n-${i + 1}`,
        course_name: `Course ${i + 1}`,
        date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T18:00:00.000Z`,
      },
      strokes,
    );
  });
}
