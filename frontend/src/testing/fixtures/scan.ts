import type { ScanResult } from "../../types/scan";

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
