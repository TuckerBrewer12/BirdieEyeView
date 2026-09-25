import type { Course as CourseDto, Round as RoundDto, RoundSummary } from "@/types/golf";
import { coursePar, getHole } from "./course";
import { scoreKind, strokesToPar, type ScoreKind } from "./score";

/** One hole as it was played. Par is resolved when the round is built: the course's hole, else par_played. */
export interface HoleScore {
  hole: number;
  par: number | null;
  strokes: number | null;
  putts: number | null;
  gir: boolean | null;
  fairway: boolean | null;
}

/** Where a round was played. A round not linked to a course keeps the card's name and no id. */
export interface RoundCourse {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
}

/**
 * A round: when and where it was played, and its hole scores in hole order.
 * Score, nines, par and to-par are functions of the holes, not stored.
 */
export interface Round {
  id: string;
  date: string | null;
  course: RoundCourse | null;
  teeBox: string | null;
  holes: HoleScore[];
  /** Stored totals, for cards that recorded them without per-hole detail. */
  totalPutts: number | null;
  totalGir: number | null;
}

export type StrokeOverrides = Record<number, { strokes: number | null }>;

export function holeToPar(hole: HoleScore): number | null {
  return strokesToPar(hole.strokes, hole.par);
}

export function holeKind(hole: HoleScore): ScoreKind | null {
  return scoreKind(hole.strokes, hole.par);
}

export function frontNine(holes: HoleScore[]): HoleScore[] {
  return holes.filter((hole) => hole.hole <= 9);
}

export function backNine(holes: HoleScore[]): HoleScore[] {
  return holes.filter((hole) => hole.hole >= 10);
}

/** Strokes over the scored holes. Null when none are scored. */
export function totalStrokes(holes: HoleScore[]): number | null {
  const scored = holes.filter((hole) => hole.strokes != null);
  return scored.length > 0 ? scored.reduce((sum, hole) => sum + hole.strokes!, 0) : null;
}

/** A nine's strokes, only once all nine holes are scored. */
export function nineTotal(holes: HoleScore[]): number | null {
  return holes.length === 9 && holes.every((hole) => hole.strokes != null) ? totalStrokes(holes) : null;
}

export function roundScore(round: Round): number | null {
  return totalStrokes(round.holes);
}

/** Course par, or the sum of the hole pars when the round has no course par. */
export function roundPar(round: Round): number | null {
  if (round.course?.par != null) return round.course.par;
  const pars = round.holes.map((hole) => hole.par).filter((par): par is number => par != null);
  return pars.length > 0 ? pars.reduce((sum, par) => sum + par, 0) : null;
}

export function roundToPar(round: Round): number | null {
  return strokesToPar(roundScore(round), roundPar(round));
}

/** The stored total, else the holes' putts once every scored hole has them. */
export function roundPutts(round: Round): number | null {
  if (round.totalPutts != null) return round.totalPutts;
  const scored = round.holes.filter((hole) => hole.strokes != null);
  if (scored.length === 0 || scored.some((hole) => hole.putts == null)) return null;
  return scored.reduce((sum, hole) => sum + hole.putts!, 0);
}

/** The stored total, else the greens hit across the holes that recorded it. */
export function roundGir(round: Round): number | null {
  if (round.totalGir != null) return round.totalGir;
  const recorded = round.holes.filter((hole) => hole.gir != null);
  return recorded.length > 0 ? recorded.filter((hole) => hole.gir).length : null;
}

export function withStrokes(round: Round, edited: StrokeOverrides): Round {
  return {
    ...round,
    holes: round.holes.map((hole) =>
      hole.hole in edited ? { ...hole, strokes: edited[hole.hole].strokes } : hole,
    ),
  };
}

export function roundFromSummary(summary: RoundSummary): Round {
  return {
    id: summary.id,
    date: summary.date,
    course: {
      id: summary.course_id,
      name: summary.course_name,
      location: summary.course_location,
      par: summary.course_par,
    },
    teeBox: summary.tee_box,
    holes: (summary.hole_scores_summary ?? [])
      .map((hole) => ({ hole: hole.h, par: hole.p, strokes: hole.s, putts: null, gir: null, fairway: null }))
      .sort((a, b) => a.hole - b.hole),
    totalPutts: summary.total_putts,
    totalGir: summary.total_gir,
  };
}

/** Pass `course` to read the round against a course other than the one it is linked to. */
export function roundFromDto(dto: RoundDto, course: CourseDto | null = dto.course): Round {
  return {
    id: dto.id ?? "",
    date: dto.date,
    course: {
      id: course?.id ?? null,
      name: dto.course_name_played ?? course?.name ?? null,
      location: course?.location ?? null,
      par: coursePar(course),
    },
    teeBox: dto.tee_box,
    holes: dto.hole_scores
      .filter((score) => score.hole_number != null)
      .map((score) => ({
        hole: score.hole_number!,
        par: getHole(course, score.hole_number!)?.par ?? score.par_played,
        strokes: score.strokes,
        putts: score.putts,
        gir: score.green_in_regulation,
        fairway: score.fairway_hit,
      }))
      .sort((a, b) => a.hole - b.hole),
    totalPutts: dto.total_putts,
    totalGir: dto.total_gir,
  };
}
