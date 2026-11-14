import type { RoundDto } from "../../types/api";
import { roundResponse } from "../fakes/roundResponses";

const PAR = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
const STROKES = [5, 4, 3, 6, 5, 4, 4, 4, 5, 4, 5, 3, 6, 4, 4, 4, 4, 4];
const PUTTS = [2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 2, 2, 2, 1];
const GREENS = [false, true, true, false, false, true, false, true, false, true, false, false, false, true, true, false, true, true];
const FAIRWAYS = [true, false, null, true, false, true, null, false, true, true, false, null, true, false, true, null, false, true];
const YARDS = [388, 402, 176, 512, 371, 395, 158, 410, 528, 362, 415, 191, 540, 384, 377, 172, 401, 515];
const HANDICAP = [7, 3, 15, 1, 11, 5, 17, 9, 13, 8, 2, 16, 4, 12, 6, 18, 10, 14];

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
    strokes: STROKES[i],
    putts: PUTTS[i],
    fairway_hit: FAIRWAYS[i],
    green_in_regulation: GREENS[i],
    par_played: par,
    handicap_played: null,
  })),
});
