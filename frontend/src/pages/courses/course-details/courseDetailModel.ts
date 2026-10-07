import { BACK_HOLES, FRONT_HOLES, getHole, getTee, teesByLength } from "@/domain/course";
import type { Course, Tee } from "@/types/golf";
import type { CourseAnalyticsData } from "@/types/analytics";

export type PageTabKey = "course" | "performance";
export type ChartTabKey = "score" | "gir" | "putts" | "variance";

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
}

export const PAGE_TABS: TabItem<PageTabKey>[] = [
  { key: "course", label: "Course" },
  { key: "performance", label: "My Performance" },
];

export const CHART_TABS: TabItem<ChartTabKey>[] = [
  { key: "score", label: "Score" },
  { key: "gir", label: "GIR" },
  { key: "putts", label: "Putts" },
  { key: "variance", label: "Variance" },
];

export const EMPTY_ANALYTICS: CourseAnalyticsData = {
  course_id: "",
  rounds_played: 0,
  scoring_average: null,
  best_score: null,
  worst_score: null,
  rounds: [],
  score_trend_on_course: [],
  average_score_relative_to_par_by_hole: [],
  gir_percentage_by_hole: [],
  average_putts_by_hole: [],
  score_type_distribution_by_hole: [],
  course_difficulty_profile_by_hole: [],
  average_score_when_gir_vs_missed: [],
  score_variance_by_hole: [],
};

/** A tee button: the tee and what the golfer would play off it. */
export interface TeeChip {
  tee: Tee;
  selected: boolean;
  courseHandicap: number | null;
}

export interface ScorecardHole {
  hole: number;
  par: number | null;
  handicap: number | null;
  yards: number | null;
  /** The golfer's average strokes here, when they have played the course. */
  personalAverage: number | null;
}

/** One nine of the course scorecard. The back nine also carries the course totals. */
export interface ScorecardNine {
  side: "front" | "back";
  /** The tee whose yardages fill the yards row; null hides the row. */
  tee: Tee | null;
  holes: ScorecardHole[];
  par: number | null;
  yards: number | null;
  personalAverage: number | null;
  totals: { par: number | null; yards: number | null; personalAverage: number | null } | null;
}

export type CourseChart =
  | { kind: "toPar"; group: ChartTabKey; rows: CourseAnalyticsData["average_score_relative_to_par_by_hole"] }
  | { kind: "scoreType"; group: ChartTabKey; rows: CourseAnalyticsData["score_type_distribution_by_hole"] }
  | { kind: "gir"; group: ChartTabKey; rows: CourseAnalyticsData["gir_percentage_by_hole"] }
  | { kind: "putts"; group: ChartTabKey; rows: CourseAnalyticsData["average_putts_by_hole"] }
  | { kind: "difficulty"; group: ChartTabKey; rows: CourseAnalyticsData["course_difficulty_profile_by_hole"] }
  | { kind: "variance"; group: ChartTabKey; rows: CourseAnalyticsData["score_variance_by_hole"] };

/** The golfer's average strokes per hole, or null until they have played the course. */
export function personalAverages(analytics: CourseAnalyticsData): Record<number, number> | null {
  if (analytics.rounds_played === 0) return null;
  const rows = analytics.average_score_relative_to_par_by_hole;
  if (rows.length === 0) return null;
  return Object.fromEntries(rows.map((row) => [row.hole_number, row.average_score]));
}

function sumOf(holes: readonly number[], averages: Record<number, number>): number {
  return holes.reduce((sum, n) => sum + (averages[n] ?? 0), 0);
}

export function nineFrom(
  course: Course,
  side: "front" | "back",
  tee: Tee | null,
  averages: Record<number, number> | null,
): ScorecardNine {
  const holes = side === "front" ? FRONT_HOLES : BACK_HOLES;
  const back = side === "back";
  return {
    side,
    tee,
    holes: holes.map((n) => ({
      hole: n,
      par: getHole(course, n)?.par ?? null,
      handicap: getHole(course, n)?.handicap ?? null,
      yards: tee?.hole_yardages[n] || null,
      personalAverage: averages?.[n] ?? null,
    })),
    par: back ? course.back_nine_par : course.front_nine_par,
    yards: (back ? tee?.back_nine_yardage : tee?.front_nine_yardage) ?? null,
    personalAverage: averages ? sumOf(holes, averages) : null,
    totals: back
      ? {
          par: course.par,
          yards: tee?.total_yardage ?? null,
          personalAverage: averages ? sumOf([...FRONT_HOLES, ...BACK_HOLES], averages) : null,
        }
      : null,
  };
}

/**
 * The tee the scorecard shows: the golfer's pick, or the longest until they pick one.
 * `picked` is undefined before any pick and null once they tap the selected tee off.
 */
export function selectedTee(course: Course, picked: string | null | undefined): Tee | null {
  if (picked === undefined) return teesByLength(course)[0] ?? null;
  return getTee(course, picked);
}

export function chartsFrom(analytics: CourseAnalyticsData): CourseChart[] {
  return [
    { kind: "toPar", group: "score", rows: analytics.average_score_relative_to_par_by_hole },
    { kind: "scoreType", group: "score", rows: analytics.score_type_distribution_by_hole },
    { kind: "gir", group: "gir", rows: analytics.gir_percentage_by_hole },
    { kind: "putts", group: "putts", rows: analytics.average_putts_by_hole },
    { kind: "difficulty", group: "variance", rows: analytics.course_difficulty_profile_by_hole },
    { kind: "variance", group: "variance", rows: analytics.score_variance_by_hole },
  ];
}
