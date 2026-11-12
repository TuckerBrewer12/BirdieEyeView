import {
  BACK_HOLES,
  FRONT_HOLES,
  formatTeeName,
  getHole,
  getTee,
  teeRatingLabel,
  teesByLength,
} from "@/domain/course";
import type { CourseAnalytics, NineFigures } from "@/domain/courseAnalytics";
import { formatDayShort } from "@/domain/date";
import { formatCount, formatOneDecimal } from "@/domain/format";
import { formatCourseHandicap } from "@/domain/handicap";
import { formatAverageToParTenths, roundAverageToParTenths, toParLabel } from "@/domain/score";
import type { CourseDto, TeeDto } from "@/types/api";

/** How many of the golfer's latest rounds here the page lists. */
export const RECENT_ROUNDS = 5;

/**
 * The tee the scorecard shows: the golfer's pick, or the longest until they pick one. A pick that
 * matches no tee falls back to the longest too.
 */
export function selectedTee(course: CourseDto, picked: string | null): TeeDto | null {
  return (picked != null ? getTee(course, picked) : null) ?? teesByLength(course)[0] ?? null;
}

/** The scorecard's bar for a tee: "Blue tees · 6,500 yds · 72.4 / 130 · hcp 12". */
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

/** An average to par as the scorecard shows it: rounded to a tenth, so its colour follows what it reads. */
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
  /** The golfer's average here to par, once they have played the hole. */
  averageToPar: AverageToPar | null;
  /** The greens they have hit here (0-100), once one is recorded. */
  greens: number | null;
}

/** A nine's figures where it closes: Out or In, and on the back nine also the course's Tot. */
export interface ScorecardTotals {
  par: number | null;
  yards: number | null;
  averageToPar: AverageToPar | null;
  greens: number | null;
}

/** One nine of the course scorecard. */
export interface ScorecardNine {
  side: "front" | "back";
  holes: ScorecardHole[];
  /** Out or In. */
  nine: ScorecardTotals;
  /** The course's totals, carried by the back nine. */
  course: ScorecardTotals | null;
}

const NO_NINES: NineFigures = { front: null, back: null, total: null };

/** One nine of the scorecard off `tee`, with the golfer's rows when they have played here. */
export function nineFrom(
  course: CourseDto,
  side: "front" | "back",
  tee: TeeDto | null,
  analytics: CourseAnalytics | null,
): ScorecardNine {
  const back = side === "back";
  const toPar = new Map(analytics?.holeToPar.map((row) => [row.hole, row.averageToPar]));
  const greens = new Map(analytics?.greens.map((row) => [row.hole, row.value]));
  const nineToPar = analytics?.nineToPar ?? NO_NINES;
  const nineGreens = analytics?.nineGreens ?? NO_NINES;
  return {
    side,
    holes: (back ? BACK_HOLES : FRONT_HOLES).map((n) => {
      // A 0 is a yardage the card didn't have, not a hole with no length.
      const yards = tee?.hole_yardages[n];
      return {
        hole: n,
        par: getHole(course, n)?.par ?? null,
        handicap: getHole(course, n)?.handicap ?? null,
        yards: yards != null && yards > 0 ? yards : null,
        averageToPar: averageToPar(toPar.get(n)),
        greens: greens.get(n) ?? null,
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

/** One figure of the golfer's record here: the figure, and under or beside it its to par and when. */
export interface RecordFigure {
  label: string;
  value: string;
  /** The to par to colour, and how it reads. */
  toPar: { value: number; label: string } | null;
  /** When, or how long ago: "Jun 15". */
  note: string | null;
}

/** Rounds, average, best and worst: the golfer's record at the course, every figure the server's. */
export function recordFigures(analytics: CourseAnalytics): RecordFigure[] {
  const round = (label: string, played: CourseAnalytics["bestRound"]): RecordFigure => ({
    label,
    value: played?.score != null ? String(played.score) : "—",
    toPar: played?.toPar != null ? { value: played.toPar, label: toParLabel(played.toPar) ?? "" } : null,
    note: formatDayShort(played?.date),
  });
  const average = averageToPar(analytics.scoringAverageToPar);
  const last = formatDayShort(analytics.lastPlayed);
  return [
    { label: "Rounds", value: String(analytics.roundsPlayed), toPar: null, note: last ? `last ${last}` : null },
    { label: "Average", value: formatOneDecimal(analytics.scoringAverage), toPar: average, note: null },
    round("Best", analytics.bestRound),
    round("Worst", analytics.worstRound),
  ];
}
