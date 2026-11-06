import { BACK_HOLES, FRONT_HOLES, getHole, getTee, teesByLength } from "@/domain/course";
import type { CourseAnalytics, HoleFigure, HoleScoreMix, HoleToPar, NineAverages } from "@/domain/courseAnalytics";
import type { CourseDto, TeeDto } from "@/types/api";

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

/** A tee button: the tee and what the golfer would play off it. */
export interface TeeChip {
  tee: TeeDto;
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
  tee: TeeDto | null;
  holes: ScorecardHole[];
  par: number | null;
  yards: number | null;
  personalAverage: number | null;
  totals: { par: number | null; yards: number | null; personalAverage: number | null } | null;
}

export type CourseChart =
  | { kind: "toPar" | "difficulty"; group: ChartTabKey; rows: HoleToPar[] }
  | { kind: "scoreType"; group: ChartTabKey; rows: HoleScoreMix[] }
  | { kind: "gir" | "putts" | "variance"; group: ChartTabKey; rows: HoleFigure[] };

/** The golfer's average strokes per hole, and summed by nine as the server added them. */
export interface PersonalAverages extends NineAverages {
  byHole: Record<number, number>;
}

/** The golfer's averages, or null until they have played the course. */
export function personalAverages(analytics: CourseAnalytics): PersonalAverages | null {
  if (analytics.roundsPlayed === 0) return null;
  const rows = analytics.holeToPar;
  if (rows.length === 0) return null;
  return { byHole: Object.fromEntries(rows.map((row) => [row.hole, row.averageScore])), ...analytics.nineAverages };
}

export function nineFrom(
  course: CourseDto,
  side: "front" | "back",
  tee: TeeDto | null,
  averages: PersonalAverages | null,
): ScorecardNine {
  const holes = side === "front" ? FRONT_HOLES : BACK_HOLES;
  const back = side === "back";
  return {
    side,
    tee,
    holes: holes.map((n) => {
      // A 0 is a yardage the card didn't have, not a hole with no length.
      const yards = tee?.hole_yardages[n];
      return {
        hole: n,
        par: getHole(course, n)?.par ?? null,
        handicap: getHole(course, n)?.handicap ?? null,
        yards: yards != null && yards > 0 ? yards : null,
        personalAverage: averages?.byHole[n] ?? null,
      };
    }),
    par: back ? course.back_nine_par : course.front_nine_par,
    yards: (back ? tee?.back_nine_yardage : tee?.front_nine_yardage) ?? null,
    personalAverage: (back ? averages?.back : averages?.front) ?? null,
    totals: back
      ? {
          par: course.par,
          yards: tee?.total_yardage ?? null,
          personalAverage: averages?.total ?? null,
        }
      : null,
  };
}

/**
 * The tee the scorecard shows: the golfer's pick, or the longest until they pick one.
 * `picked` is undefined before any pick and null once they tap the selected tee off.
 */
export function selectedTee(course: CourseDto, picked: string | null | undefined): TeeDto | null {
  if (picked === undefined) return teesByLength(course)[0] ?? null;
  return getTee(course, picked);
}

export function chartsFrom(analytics: CourseAnalytics): CourseChart[] {
  return [
    { kind: "toPar", group: "score", rows: analytics.holeToPar },
    { kind: "scoreType", group: "score", rows: analytics.scoreMix },
    { kind: "gir", group: "gir", rows: analytics.gir },
    { kind: "putts", group: "putts", rows: analytics.putts },
    { kind: "difficulty", group: "variance", rows: analytics.difficulty },
    { kind: "variance", group: "variance", rows: analytics.variance },
  ];
}
