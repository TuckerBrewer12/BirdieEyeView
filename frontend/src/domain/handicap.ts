import type { TeeDto } from "@/types/api";

export function courseHandicap(
  hi: number,
  slope: number,
  courseRating: number,
  par: number,
): number {
  return Math.round((hi * slope) / 113 + (courseRating - par));
}

type RatedTee = Pick<TeeDto, "slope_rating" | "course_rating">;

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

export function formatCourseHandicap(ch: number | null | undefined): string {
  if (ch == null) return "—";
  if (ch < 0) return `+${Math.abs(ch)}`;
  return String(ch);
}

export type DifferentialStatus = "counting" | "close" | "out" | "unrated";

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

export function formatHandicapInputValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  if (value < 0) {
    return `+${formatAbsOneDecimal(value)}`;
  }
  return formatAbsOneDecimal(value);
}

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
