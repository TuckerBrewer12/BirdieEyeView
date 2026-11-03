import type { RoundDto } from "../../types/api";
import { roundResponse } from "../fakes/roundResponses";

const PAR = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
/** Strokes over par on each hole: a 78 with a birdie on the last. */
const OVER = [1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, -1];
const PUTTS = [2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 2, 2, 2, 1];
const YARDS = [388, 402, 176, 512, 371, 395, 158, 410, 528, 362, 415, 191, 540, 384, 377, 172, 401, 515];
const HANDICAP = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 2, 16, 4, 12, 6, 18, 10, 14];

/**
 * A full card as the scorecard board draws it: Half Moon Bay from the blue tees, with yardage, handicap,
 * putts, greens and fairways on every hole (none on a par 3's fairway), worked out as the server would.
 */
export const fullCardRound: RoundDto = roundResponse({
  id: "round-full-card",
  course: {
    id: "course-hmb",
    name: "Half Moon Bay",
    location: "Half Moon Bay, CA",
    par: 72,
    holes: PAR.map((par, i) => ({ number: i + 1, par, handicap: HANDICAP[i] })),
    tees: [
      {
        color: "Blue",
        total_yardage: null,
        hole_yardages: Object.fromEntries(YARDS.map((yards, i) => [i + 1, yards])),
        slope_rating: 128,
        course_rating: 71.6,
      },
    ],
  },
  tee_box: "Blue",
  date: "2026-06-15T18:00:00.000Z",
  notes: null,
  weather_conditions: null,
  course_name_played: null,
  user_tee: null,
  hole_scores: PAR.map((par, i) => ({
    hole_number: i + 1,
    strokes: par + OVER[i],
    putts: PUTTS[i],
    fairway_hit: par === 3 ? null : i % 3 !== 1,
    green_in_regulation: par + OVER[i] - PUTTS[i] <= par - 2,
    par_played: par,
    handicap_played: null,
  })),
});
