import type { TeeDto } from "@/types/api";

/** WHS course handicap: (HI × Slope / 113) + (Course Rating − Par), rounded. */
export function courseHandicap(
  hi: number,
  slope: number,
  courseRating: number,
  par: number,
): number {
  return Math.round((hi * slope) / 113 + (courseRating - par));
}

type RatedTee = Pick<TeeDto, "slope_rating" | "course_rating">;

/** Course handicap when HI, tee ratings, and par are all present. */
export function ratedCourseHandicap(
  hi: number | null | undefined,
  tee: RatedTee | null | undefined,
  par: number | null | undefined,
): number | null {
  if (
    hi == null ||
    tee?.slope_rating == null ||
    tee?.course_rating == null ||
    par == null
  ) {
    return null;
  }
  return courseHandicap(hi, tee.slope_rating, tee.course_rating, par);
}

export function netScore(grossScore: number, courseHandicapValue: number): number {
  return grossScore - courseHandicapValue;
}

export function formatHandicapIndex(hi: number | null | undefined): string {
  if (hi == null) return "—";
  if (hi < 0) return `+${Math.abs(hi).toFixed(1)}`;
  return hi.toFixed(1);
}

/** A course handicap as golfers write it: whole strokes, and "+2" for a plus handicap. */
export function formatCourseHandicap(ch: number | null | undefined): string {
  if (ch == null) return "—";
  if (ch < 0) return `+${Math.abs(ch)}`;
  return String(ch);
}

/**
 * Where a round's differential stands in the WHS window: counted toward the index,
 * within two strokes of the cut-off, outside it, or not rated at all. The server
 * decides it (`analytics/handicap.py`) and sends it on each handicap-trend point.
 */
export type DifferentialStatus = "counting" | "close" | "out" | "unrated";

/** The lowest index WHS allows: a +10. Stored negative, as the server stores it. */
const MIN_HANDICAP_INDEX = -10;
const MAX_HANDICAP_INDEX = 54;
const HANDICAP_PATTERN = /^\+?(?:\d+\.?\d*|\.\d+)$/;

export interface HandicapParseResult {
  value: number | null;
  error: string | null;
}

function formatAbsOneDecimal(value: number): string {
  const abs = Math.abs(Math.round(value * 10) / 10);
  return Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
}

/** An index as the player types it into a field: "+5" for a plus handicap, no trailing ".0". Empty when unset. */
export function formatHandicapInputValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  if (value < 0) {
    return `+${formatAbsOneDecimal(value)}`;
  }
  return formatAbsOneDecimal(value);
}

/** Reads a typed index ("+3.0", "18.4", or blank to clear) into the stored value, or says what is wrong. */
export function parseHandicapInput(raw: string): HandicapParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (!HANDICAP_PATTERN.test(trimmed)) {
    return {
      value: null,
      error: "Handicap must be a number between +10 and 54 (for example +3.0 or 18.4).",
    };
  }
  const isPlusHandicap = trimmed.startsWith("+");
  const rawNumber = Number(isPlusHandicap ? trimmed.slice(1) : trimmed);
  const parsed = isPlusHandicap ? -rawNumber : rawNumber;
  if (!Number.isFinite(parsed) || parsed < MIN_HANDICAP_INDEX || parsed > MAX_HANDICAP_INDEX) {
    return {
      value: null,
      error: "Handicap must be between +10 and 54.",
    };
  }
  return { value: Math.round(parsed * 10) / 10, error: null };
}
