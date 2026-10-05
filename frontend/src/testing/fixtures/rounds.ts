import type { RoundSummaryDto } from "../../types/api";
import type { StoredCourse } from "../fakes/courseResponses";
import { summaryResponse, type StoredRound } from "../fakes/roundResponses";

const STANDARD_PAR = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

/** A course as the round list knows it: name and par, no holes or tees. */
function listedCourse(id: string, name: string, location: string | null): StoredCourse {
  return { id, name, location, par: 72, holes: [], tees: [] };
}

/** Round totals, spread over the holes: one-putts first, then greens and fairways hit on the opening holes. */
interface Totals {
  putts: number;
  gir: number;
  fairways: number;
}

function played(
  round: Omit<StoredRound, "hole_scores" | "weather_conditions" | "user_tee" | "course_name_played"> & {
    course_name_played?: string | null;
  },
  strokes: number[],
  totals: Totals = { putts: 32, gir: 7, fairways: 8 },
): StoredRound {
  const onePutts = strokes.length * 2 - totals.putts;
  return {
    ...round,
    course_name_played: round.course_name_played ?? null,
    weather_conditions: null,
    user_tee: null,
    hole_scores: strokes.map((s, i) => ({
      hole_number: i + 1,
      strokes: s,
      putts: i < onePutts ? 1 : 2,
      fairway_hit: i < totals.fairways,
      green_in_regulation: i < totals.gir,
      par_played: STANDARD_PAR[i] ?? 4,
      handicap_played: null,
    })),
  };
}

const halfMoonBay = listedCourse("course-hmb", "Half Moon Bay", "Half Moon Bay, CA");

export const storedRounds: StoredRound[] = [
  played(
    { id: "round-1", course: halfMoonBay, tee_box: "Blue", date: "2026-06-15T18:00:00.000Z", notes: null },
    [5, 4, 3, 6, 5, 4, 5, 3, 5, 4, 5, 3, 6, 4, 4, 5, 3, 4],
    { putts: 32, gir: 7, fairways: 8 },
  ),
  played(
    { id: "round-2", course: halfMoonBay, tee_box: "White", date: "2026-05-02T18:00:00.000Z", notes: null },
    [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5],
    { putts: 30, gir: 10, fairways: 9 },
  ),
  played(
    {
      id: "round-3",
      course: listedCourse("course-blue-rock", "Blue Rock", "South Yarmouth, MA"),
      tee_box: "Blue",
      date: "2026-04-18T18:00:00.000Z",
      notes: null,
    },
    [4, 3, 3, 4, 4, 4, 4, 2, 5, 4, 4, 3, 4, 4, 4, 4, 3, 6],
    { putts: 28, gir: 12, fairways: 11 },
  ),
  played(
    {
      id: "round-4",
      course: null,
      course_name_played: "Scanned Scorecard",
      tee_box: null,
      date: "2026-03-09T18:00:00.000Z",
      notes: null,
    },
    [5, 5, 4, 6, 5, 4, 5, 3, 6, 5, 5, 4, 6, 5, 4, 5, 3, 5],
    { putts: 36, gir: 4, fairways: 5 },
  ),
];

/** The round list as the server sends it. */
export const populatedRounds: RoundSummaryDto[] = storedRounds.map(summaryResponse);

/** `count` rounds at different courses, scoring 70, 71, 72… by giving the first holes a shot back or extra. */
export function nRounds(count: number): RoundSummaryDto[] {
  return Array.from({ length: count }, (_, i) => {
    const toPar = i - 2;
    return summaryResponse(
      played(
        {
          id: `round-n-${i + 1}`,
          course: listedCourse(`course-n-${i + 1}`, `Course ${i + 1}`, "Half Moon Bay, CA"),
          tee_box: "Blue",
          date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T18:00:00.000Z`,
          notes: null,
        },
        STANDARD_PAR.map((par, hole) => (hole < Math.abs(toPar) ? par + Math.sign(toPar) : par)),
      ),
    );
  });
}
