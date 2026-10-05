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

// Spelled out in full so Tailwind finds every class when it scans the source.
const SCORE_FILL_CLASS: Record<ScoreKey, string> = {
  eagle: "bg-score-eagle-base",
  birdie: "bg-score-birdie-base",
  par: "bg-score-par-base",
  bogey: "bg-score-bogey-base",
  double: "bg-score-double-base",
  triple: "bg-score-triple-base",
  quad: "bg-score-quad-base",
};

/** Tailwind background for a hole's score chip. */
export function scoreFillClass(key: ScoreKey): string {
  return SCORE_FILL_CLASS[key];
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

/** Badge fill + text for a to-par figure on a history row. */
export function toParBadgeClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "bg-muted text-muted-foreground";
  if (toPar < 0) return "bg-accent text-score-birdie";
  return "bg-destructive/10 text-score-bogey";
}

// Spelled out in full for the same reason as SCORE_FILL_CLASS.
const SCORE_ON_FILL_CLASS: Record<ScoreKey, string> = {
  eagle: "text-score-eagle-on-base",
  birdie: "text-score-birdie-on-base",
  par: "text-score-par-on-base",
  bogey: "text-score-bogey-on-base",
  double: "text-score-double-on-base",
  triple: "text-score-triple-on-base",
  quad: "text-score-quad-on-base",
};

/** Tailwind text colour that reads on `scoreFillClass`. */
export function scoreOnFillClass(key: ScoreKey): string {
  return SCORE_ON_FILL_CLASS[key];
}
