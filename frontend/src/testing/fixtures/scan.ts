import type { ExtractedRound, ScanResult } from "../../types/scan";

export const SCANNED_COURSE_NAME = "Half Moon Bay Golf Links";

const PARS = [4, 4, 3, 5, 4, 4, 3, 5, 3, 4, 5, 4, 3, 4, 4, 5, 3, 4];
const STROKES = [5, 4, 3, 6, 5, 4, 4, 5, 3, 4, 6, 5, 3, 5, 4, 5, 4, 4];
const PUTTS = [2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 2, 2, 2, 3, 2];

/** What extract sends back for a clean, fully read 18-hole card. */
export const scannedCard: ScanResult = {
  round: {
    course: {
      name: SCANNED_COURSE_NAME,
      location: "Half Moon Bay, CA",
      par: PARS.reduce((total, par) => total + par, 0),
      holes: PARS.map((par, i) => ({ number: i + 1, par, handicap: i + 1 })),
      tees: [],
    },
    tee_box: "Blue",
    date: null,
    hole_scores: PARS.map((par, i) => ({
      hole_number: i + 1,
      strokes: STROKES[i],
      putts: PUTTS[i],
      shots_to_green: null,
      fairway_hit: null,
      green_in_regulation: STROKES[i] - PUTTS[i] <= par - 2,
    })),
    notes: null,
  },
  confidence: { overall: 1, level: "high", hole_scores: [] },
  fields_needing_review: [],
};

const TEE_CARD_PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4];
const TEE_CARD_STROKES = [5, 4, 3, 7, 4, 5, 2, 6, 4, 5, 6, 3, 4, 5, 4, 4, 5, 5];
const SHOTS_TO_GREEN = [3, 2, 1, 4, 2, 3, 1, 3, 2, 3, 3, 1, 2, 3, 2, 2, 3, 3];
const BLUE_YARDS = [402, 388, 176, 521, 410, 395, 162, 540, 418, 405, 512, 188, 377, 430, 392, 171, 548, 421];

/** A card read with its tee's yardages and shots-to-green, but no putts or greens. */
export const scannedTeeCard: ExtractedRound = {
  course: {
    name: "Torrey Pines",
    location: "La Jolla, CA",
    par: 72,
    holes: TEE_CARD_PAR.map((par, i) => ({ number: i + 1, par, handicap: null })),
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
  hole_scores: TEE_CARD_STROKES.map((strokes, i) => ({
    hole_number: i + 1,
    strokes,
    putts: null,
    shots_to_green: SHOTS_TO_GREEN[i],
    fairway_hit: null,
    green_in_regulation: null,
  })),
  notes: null,
};
