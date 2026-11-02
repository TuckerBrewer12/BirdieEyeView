import type { FieldConfidenceDto, ScanDto, ScannedRoundDto } from "../../types/api";

export const SCANNED_COURSE_NAME = "Half Moon Bay Golf Links";

const PARS = [4, 4, 3, 5, 4, 4, 3, 5, 3, 4, 5, 4, 3, 4, 4, 5, 3, 4];
const STROKES = [5, 4, 3, 6, 5, 4, 4, 5, 3, 4, 6, 5, 3, 5, 4, 5, 4, 4];
const PUTTS = [2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 1, 2, 2, 2, 3, 2];

/** What extract sends back for a clean, fully read 18-hole card. */
export const scannedCard: ScanDto = {
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

/** The holes `unsureCard` couldn't read a score for, or read one it wasn't sure of. */
export const UNSURE_HOLES = [4, 11];

const level = (sure: boolean): FieldConfidenceDto["level"] => (sure ? "high" : "very_low");
const confidence = (value: number, sure: boolean): FieldConfidenceDto => ({
  final_confidence: value,
  level: level(sure),
  validation_flags: [],
});

/**
 * The same card, read less cleanly: no score on hole 4, a score on hole 11 the scan wasn't sure of,
 * and putts it couldn't read on hole 2. Only the two scores are worth checking.
 */
export const unsureCard: ScanDto = {
  ...scannedCard,
  round: {
    ...scannedCard.round,
    hole_scores: scannedCard.round.hole_scores.map((score) =>
      score.hole_number === 4 ? { ...score, strokes: null } : score.hole_number === 2 ? { ...score, putts: null } : score,
    ),
  },
  confidence: {
    overall: 0.8,
    level: "medium",
    hole_scores: PARS.map((_, i) => {
      const hole = i + 1;
      const sureStrokes = !UNSURE_HOLES.includes(hole);
      const surePutts = hole !== 2;
      return {
        hole_number: hole,
        fields: {
          strokes: confidence(sureStrokes ? 0.9 : 0.2, sureStrokes),
          putts: confidence(surePutts ? 0.85 : 0.25, surePutts),
          green_in_regulation: null,
        },
        overall: sureStrokes && surePutts ? 0.85 : 0.2,
        level: level(sureStrokes && surePutts),
      };
    }),
  },
  fields_needing_review: ["Hole 4 strokes missing"],
};

const TEE_CARD_PAR = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5, 4];
const TEE_CARD_STROKES = [5, 4, 3, 7, 4, 5, 2, 6, 4, 5, 6, 3, 4, 5, 4, 4, 5, 5];
const SHOTS_TO_GREEN = [3, 2, 1, 4, 2, 3, 1, 3, 2, 3, 3, 1, 2, 3, 2, 2, 3, 3];
const BLUE_YARDS = [402, 388, 176, 521, 410, 395, 162, 540, 418, 405, 512, 188, 377, 430, 392, 171, 548, 421];

/** A card read with its tee's yardages and shots-to-green, but no putts or greens. */
export const scannedTeeCard: ScannedRoundDto = {
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
