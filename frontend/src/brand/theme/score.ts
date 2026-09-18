import { SCORE_KINDS, scoreKind, type ScoreKind } from "@/domain/score";
import { colors, type ScoreSwatch } from "./colors";

/** Display order for legends and mix bars. Same set as `ScoreKind`. */
export const SCORE_KEYS = SCORE_KINDS;

export type ScoreKey = ScoreKind;

export type ScoreTone = ScoreSwatch;

/** Brand mapping of a hole onto score tokens. Unknowns read as par. */
export function scoreKeyFor(
  strokes: number | null,
  par: number | null,
): ScoreKey {
  return scoreKind(strokes, par) ?? "par";
}

/** The base fill for a hole, for the cases a static class cannot express. */
export function scoreFill(
  strokes: number | null,
  par: number | null,
): string {
  return colors.score[scoreKeyFor(strokes, par)].base;
}

/**
 * Swatch for a round's to-par, not a hole. Even and missing recede as par;
 * a round does not earn eagle/quad the way a hole does.
 */
export function toParTone(toPar: number | null): ScoreTone {
  if (toPar == null || toPar === 0) return colors.score.par;
  if (toPar <= -2) return colors.score.eagle;
  if (toPar < 0) return colors.score.birdie;
  return colors.score.bogey;
}

export function toParFill(toPar: number | null): string {
  return toParTone(toPar).base;
}

export function toParLabel(toPar: number | null): string | null {
  if (toPar == null) return null;
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

/** Tailwind text color for a to-par figure: under par reads birdie, over reads bogey. */
export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}
