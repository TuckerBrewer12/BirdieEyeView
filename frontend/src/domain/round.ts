import type { Course, Round, RoundSummary } from "@/types/golf";
import { coursePar, getHole } from "./course";
import { scoreKind, strokesToPar, type ScoreKind } from "./score";

export type StrokeOverrides = Record<number, { strokes: number | null }>;

/** One hole of a round and how it was scored. An unscored hole keeps its slot with null strokes. */
export interface HoleResult {
  hole: number;
  strokes: number | null;
  par: number | null;
  toPar: number | null;
  kind: ScoreKind | null;
}

/** A hole that was actually played, with its stats. */
export interface PlayedHole extends HoleResult {
  strokes: number;
  gir: boolean | null;
  fairway: boolean | null;
}

export function totalStrokes(round: Round, edited?: StrokeOverrides): number {
  return round.hole_scores.reduce((sum, score) => {
    const strokes =
      edited && score.hole_number != null && score.hole_number in edited
        ? edited[score.hole_number].strokes
        : score.strokes;
    return sum + (strokes ?? 0);
  }, 0);
}

/** Course par, or the sum of par_played when the round has no course. */
export function roundPar(round: Round, course?: Course | null): number | null {
  const active = course !== undefined ? course : round.course;
  if (active) return coursePar(active);
  const pars = round.hole_scores
    .map((score) => score.par_played)
    .filter((par): par is number => par != null);
  return pars.length > 0 ? pars.reduce((sum, par) => sum + par, 0) : null;
}

export function roundToPar(
  round: Round,
  course?: Course | null,
  edited?: StrokeOverrides,
): number | null {
  return strokesToPar(totalStrokes(round, edited), roundPar(round, course));
}

export function holePar(
  round: Round,
  holeNumber: number,
  course?: Course | null,
): number | null {
  const active = course !== undefined ? course : round.course;
  const fromCourse = getHole(active, holeNumber)?.par ?? null;
  if (fromCourse != null) return fromCourse;
  return round.hole_scores.find((score) => score.hole_number === holeNumber)?.par_played ?? null;
}

export function holeResult(hole: number, strokes: number | null, par: number | null): HoleResult {
  return { hole, strokes, par, toPar: strokesToPar(strokes, par), kind: scoreKind(strokes, par) };
}

/** The per-hole strip a round summary carries, unscored holes included. */
export function summaryHoles(summary: RoundSummary): HoleResult[] {
  return (summary.hole_scores_summary ?? []).map((hole) => holeResult(hole.h, hole.s, hole.p));
}

/** Scored holes with resolved par. Missing par stays null — never a silent 4. */
export function playedHoles(round: Round, course?: Course | null): PlayedHole[] {
  return round.hole_scores
    .filter((score) => score.hole_number != null && score.strokes != null)
    .map((score) => {
      const par = holePar(round, score.hole_number!, course);
      return {
        ...holeResult(score.hole_number!, score.strokes, par),
        strokes: score.strokes!,
        putts: score.putts,
        gir: score.green_in_regulation,
        fairway: score.fairway_hit,
      };
    })
    .sort((a, b) => a.hole - b.hole);
}

export function frontNine(holes: PlayedHole[]): PlayedHole[] {
  return holes.filter((hole) => hole.hole <= 9);
}

export function backNine(holes: PlayedHole[]): PlayedHole[] {
  return holes.filter((hole) => hole.hole >= 10);
}

export function nineTotal(holes: PlayedHole[]): number | null {
  return holes.length === 9 ? holes.reduce((sum, hole) => sum + hole.strokes, 0) : null;
}
