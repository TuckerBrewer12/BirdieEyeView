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
