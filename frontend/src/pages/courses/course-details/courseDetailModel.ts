import {
  BACK_HOLES,
  FRONT_HOLES,
  formatTeeName,
  getHole,
  getTee,
  teeRatingLabel,
} from "@/domain/course";
import type { CourseAnalytics, HoleStats, NineFigures } from "@/domain/courseAnalytics";
import { formatDayShort } from "@/domain/date";
import { formatCount, formatOneDecimal, formatPercent } from "@/domain/format";
import { formatCourseHandicap } from "@/domain/handicap";
import { formatAverageToParTenths, roundAverageToParTenths, toParLabel } from "@/domain/score";
import type { RoundTrendPoint } from "@/domain/trend";
import type { CourseDto, TeeDto } from "@/types/api";

export const RECENT_ROUNDS = 5;

export function namedTees(course: CourseDto): TeeDto[] {
  return course.tees.filter((tee) => !!tee.color);
}

export function selectedTee(course: CourseDto, picked: string | null): TeeDto | null {
  return (picked != null ? getTee(course, picked) : null) ?? namedTees(course)[0] ?? null;
}

export function teeLine(tee: TeeDto): string {
  return [
    tee.color ? formatTeeName(tee.color) : null,
    tee.total_yardage != null ? `${formatCount(tee.total_yardage)} yds` : null,
    teeRatingLabel(tee),
    tee.course_handicap != null ? `hcp ${formatCourseHandicap(tee.course_handicap)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface AverageToPar {
  value: number;
  label: string;
}

function averageToPar(value: number | null | undefined): AverageToPar | null {
  if (value == null) return null;
  return { value: roundAverageToParTenths(value), label: formatAverageToParTenths(value) };
}

export interface ScorecardHole {
  hole: number;
  par: number | null;
  handicap: number | null;
  yards: number | null;
  averageToPar: AverageToPar | null;
  greens: number | null;
}

export interface ScorecardTotals {
  par: number | null;
  yards: number | null;
  averageToPar: AverageToPar | null;
  greens: number | null;
}

export interface ScorecardNine {
  side: "front" | "back";
  holes: ScorecardHole[];
  nine: ScorecardTotals;
  course: ScorecardTotals | null;
}

const NO_NINES: NineFigures = { front: null, back: null, total: null };

export function nineFrom(
  course: CourseDto,
  side: "front" | "back",
  tee: TeeDto | null,
  analytics: CourseAnalytics | null,
): ScorecardNine {
  const back = side === "back";
  const stats = new Map(analytics?.holes.map((row) => [row.hole, row]));
  const nineToPar = analytics?.nineToPar ?? NO_NINES;
  const nineGreens = analytics?.nineGreens ?? NO_NINES;
  return {
    side,
    holes: (back ? BACK_HOLES : FRONT_HOLES).map((n) => {
      const yards = tee?.hole_yardages[n];
      return {
        hole: n,
        par: getHole(course, n)?.par ?? null,
        handicap: getHole(course, n)?.handicap ?? null,
        yards: yards != null && yards > 0 ? yards : null,
        averageToPar: averageToPar(stats.get(n)?.averageToPar),
        greens: stats.get(n)?.greens ?? null,
      };
    }),
    nine: {
      par: back ? course.back_nine_par : course.front_nine_par,
      yards: (back ? tee?.back_nine_yardage : tee?.front_nine_yardage) ?? null,
      averageToPar: averageToPar(back ? nineToPar.back : nineToPar.front),
      greens: back ? nineGreens.back : nineGreens.front,
    },
    course: back
      ? {
          par: course.par,
          yards: tee?.total_yardage ?? null,
          averageToPar: averageToPar(nineToPar.total),
          greens: nineGreens.total,
        }
      : null,
  };
}

export interface RecordFigure {
  label: string;
  value: string;
  toPar: { value: number; label: string } | null;
  note: string | null;
  roundId: string | null;
}

export function recordFigures(analytics: CourseAnalytics): RecordFigure[] {
  const round = (label: string, played: CourseAnalytics["bestRound"]): RecordFigure => ({
    label,
    value: played?.score != null ? String(played.score) : "—",
    toPar: played?.toPar != null ? { value: played.toPar, label: toParLabel(played.toPar) ?? "" } : null,
    note: formatDayShort(played?.date),
    roundId: played?.id ?? null,
  });
  const average = averageToPar(analytics.scoringAverageToPar);
  const last = formatDayShort(analytics.lastPlayed);
  return [
    {
      label: "Rounds",
      value: String(analytics.roundsPlayed),
      toPar: null,
      note: last ? `last ${last}` : null,
      roundId: null,
    },
    { label: "Average", value: formatOneDecimal(analytics.scoringAverage), toPar: average, note: null, roundId: null },
    round("Best", analytics.bestRound),
    round("Worst", analytics.worstRound),
  ];
}

export type CourseView = "course" | "performance";

export const COURSE_VIEWS: { value: CourseView; label: string }[] = [
  { value: "course", label: "Course" },
  { value: "performance", label: "My performance" },
];

export type HoleOrder = "course" | "hardest";

export const HOLE_ORDERS: { value: HoleOrder; label: string }[] = [
  { value: "course", label: "By hole" },
  { value: "hardest", label: "Hardest first" },
];

export function holesInOrder(holes: readonly HoleStats[], order: HoleOrder): HoleStats[] {
  if (order === "course") return [...holes];
  return [...holes].sort((a, b) => a.difficultyRank - b.difficultyRank);
}

export function greensFigures(nines: NineFigures): { label: string; value: string }[] {
  return [
    { label: "Out", value: formatPercent(nines.front) },
    { label: "In", value: formatPercent(nines.back) },
    { label: "Total", value: formatPercent(nines.total) },
  ];
}

export interface TrendPoint {
  tick: number;
  title: string;
  values: (number | null)[];
  notes: { label: string; value: string }[];
}

export function trendPoints(trend: readonly RoundTrendPoint[]): TrendPoint[] {
  return trend.map((point, i) => ({
    tick: i + 1,
    title: `Round ${i + 1} here`,
    values: [point.score, point.rollingAverage],
    notes: [{ label: "To par", value: toParLabel(point.toPar) ?? "—" }],
  }));
}
