import type { Tee } from "@/types/golf";

/** WHS course handicap: (HI × Slope / 113) + (Course Rating − Par), rounded. */
export function courseHandicap(
  hi: number,
  slope: number,
  courseRating: number,
  par: number,
): number {
  return Math.round((hi * slope) / 113 + (courseRating - par));
}

type RatedTee = Pick<Tee, "slope_rating" | "course_rating">;

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

/** How far over the counting cut-off a differential can be and still read as close. */
export const CLOSE_TO_COUNTING = 2;

/**
 * Where a round's differential stands in the WHS window: counted toward the index,
 * close to the cut-off, outside it, or not rated at all.
 */
export type DifferentialStatus = "counting" | "close" | "out" | "unrated";

export function differentialStatus(row: {
  used_in_hi?: boolean | null;
  hi_threshold?: number | null;
  differential?: number | null;
}): DifferentialStatus {
  if (row.used_in_hi == null) return "unrated";
  if (row.used_in_hi) return "counting";
  if (
    row.hi_threshold != null &&
    row.differential != null &&
    row.differential - row.hi_threshold <= CLOSE_TO_COUNTING
  ) {
    return "close";
  }
  return "out";
}
