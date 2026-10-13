import type { ExtractedRound } from "../../types/scan";

const PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4];
const STROKES = [5, 4, 3, 7, 4, 5, 2, 6, 4, 5, 6, 3, 4, 5, 4, 4, 5, 5];
const SHOTS_TO_GREEN = [3, 2, 1, 4, 2, 3, 1, 3, 2, 3, 3, 1, 2, 3, 2, 2, 3, 3];
const BLUE_YARDS = [402, 388, 176, 521, 410, 395, 162, 540, 418, 405, 512, 188, 377, 430, 392, 171, 548, 421];

/** What a scan reads off a card: the course, its tees, and scores with shots-to-green but no putts or greens. */
export const scannedCard: ExtractedRound = {
  course: {
    name: "Torrey Pines",
    location: "La Jolla, CA",
    par: 72,
    holes: PAR.map((par, i) => ({ number: i + 1, par, handicap: null })),
    tees: [
      {
        color: "Blue",
        slope_rating: 133,
        course_rating: 73.4,
        hole_yardages: Object.fromEntries(BLUE_YARDS.map((yards, i) => [String(i + 1), yards])),
      },
    ],
  },
  tee_box: "Blue",
  date: null,
  hole_scores: STROKES.map((strokes, i) => ({
    hole_number: i + 1,
    strokes,
    putts: null,
    shots_to_green: SHOTS_TO_GREEN[i],
    fairway_hit: null,
    green_in_regulation: null,
  })),
  notes: null,
};
