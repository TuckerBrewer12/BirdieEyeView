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

/**
 * WHS “best of / adjustment” table, indexed by (ratedRoundCount − 3),
 * capped at 20 rounds. Values are [differentials used, adjustment].
 */
export const WHS_ADJUSTMENT_BY_RATED_ROUNDS: ReadonlyArray<readonly [number, number]> = [
  [1, -2.0],
  [1, -1.0],
  [1, 0.0],
  [2, -1.0],
  [2, 0.0],
  [2, 0.0],
  [3, 0.0],
  [3, 0.0],
  [3, 0.0],
  [4, 0.0],
  [4, 0.0],
  [4, 0.0],
  [5, 0.0],
  [5, 0.0],
  [6, 0.0],
  [6, 0.0],
  [7, 0.0],
  [8, 0.0],
];

export function whsWindow(ratedRoundCount: number): { countUsed: number; adjustment: number } {
  const n = Math.min(ratedRoundCount, 20);
  if (n < 3) return { countUsed: 0, adjustment: 0 };
  const [countUsed, adjustment] =
    WHS_ADJUSTMENT_BY_RATED_ROUNDS[Math.min(n - 3, WHS_ADJUSTMENT_BY_RATED_ROUNDS.length - 1)];
  return { countUsed, adjustment };
}
