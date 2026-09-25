import type { Tee } from "@/types/golf";
import type { AnalyticsData } from "@/types/analytics";

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

export type HandicapTrend = "up" | "down" | "flat";

/** Change in handicap index across the last six rated rounds. */
export function handicapDelta(trends: AnalyticsData | null): number | null {
  const valid = (trends?.handicap_trend ?? []).filter((r) => r.handicap_index != null);
  if (valid.length < 2) return null;
  const recent = valid[valid.length - 1].handicap_index!;
  const prev = valid[Math.max(0, valid.length - 6)].handicap_index!;
  return +(recent - prev).toFixed(1);
}

/** Direction of the handicap index over the whole window. Under 0.3 reads as flat. */
export function handicapTrend(trends: AnalyticsData | null): HandicapTrend | null {
  if (!trends) return null;
  const valid = trends.handicap_trend.filter((r) => r.handicap_index != null);
  if (valid.length < 3) return null;
  const diff = valid[0].handicap_index! - valid[valid.length - 1].handicap_index!;
  if (Math.abs(diff) < 0.3) return "flat";
  return diff > 0 ? "down" : "up";
}

export interface WhsRound {
  roundIndex: number;
  courseName: string | null;
  courseRating: number | null;
  slopeRating: number | null;
  score: number | null;
  differential: number | null;
  used: boolean;
}

export interface WhsBreakdown {
  rows: WhsRound[];
  windowSize: number;
  countUsed: number;
  adjustment: number;
  diffAvg: number | null;
  hasRatedRounds: boolean;
  showCalculation: boolean;
}

/** Newest-first rounds in the WHS window, which ones count, and the resulting average. */
export function whsBreakdown(
  trends: AnalyticsData | null,
  handicapIndex: number | null | undefined,
): WhsBreakdown {
  const scores = trends?.score_trend ?? [];
  const rows: WhsRound[] = scores
    .map((score, i) => {
      const hcp = trends?.handicap_trend[i];
      const diff = trends?.score_differentials.find((s) => s.round_index === score.round_index);
      return {
        roundIndex: score.round_index,
        courseName: score.course_name ?? null,
        courseRating: diff?.course_rating ?? null,
        slopeRating: diff?.slope_rating ?? null,
        score: diff?.score ?? score.total_score ?? null,
        differential: hcp?.differential ?? null,
        used: hcp?.used_in_hi === true,
      };
    })
    .reverse();
  const windowSize = Math.min(rows.filter((r) => r.differential != null).length, 20);
  const { countUsed, adjustment } = whsWindow(windowSize);
  const usedDiffs = rows
    .filter((r) => r.used && r.differential != null)
    .map((r) => r.differential!);
  const diffAvg = usedDiffs.length
    ? usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length
    : null;
  return {
    rows,
    windowSize,
    countUsed,
    adjustment,
    diffAvg,
    hasRatedRounds: (trends?.score_differentials ?? []).some((r) => r.course_rating != null),
    showCalculation: handicapIndex != null && windowSize >= 3,
  };
}
