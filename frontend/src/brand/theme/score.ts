import { scoreKind } from "@/domain/score";
import { colors } from "./colors";

/** The seven hole buckets, in display order. Matches `colors.score`. */
export const SCORE_KEYS = [
  "eagle",
  "birdie",
  "par",
  "bogey",
  "double",
  "triple",
  "quad",
] as const;

export type ScoreKey = (typeof SCORE_KEYS)[number];

export type ScoreTone = (typeof colors.score)[ScoreKey];

/** Brand mapping of a hole onto score tokens. Unknowns read as par. */
export function scoreKeyFor(
  strokes: number | null,
  par: number | null,
): ScoreKey {
  return scoreKind(strokes, par) ?? "par";
}

/** Fill / on-fill / text tokens for one bucket. This is the palette — do not copy it. */
export function scoreTone(key: ScoreKey): ScoreTone {
  return colors.score[key];
}

/** The fill token for a hole, for the cases a static class cannot express. */
export function scoreFill(
  strokes: number | null,
  par: number | null,
): string {
  return scoreTone(scoreKeyFor(strokes, par)).fill;
}

/** Ink that sits on `scoreFill`. */
export function scoreOnFill(
  strokes: number | null,
  par: number | null,
): string {
  return scoreTone(scoreKeyFor(strokes, par)).onFill;
}

/** Every bucket's fill, for legends and mix bars that iterate `SCORE_KEYS`. */
export function scoreFills(): Record<ScoreKey, string> {
  return {
    eagle: colors.score.eagle.fill,
    birdie: colors.score.birdie.fill,
    par: colors.score.par.fill,
    bogey: colors.score.bogey.fill,
    double: colors.score.double.fill,
    triple: colors.score.triple.fill,
    quad: colors.score.quad.fill,
  };
}

/**
 * Fill for a round's to-par, not a hole. Even and missing recede as par;
 * a round does not earn eagle/quad the way a hole does.
 */
export function toParFill(toPar: number | null): string {
  if (toPar == null || toPar === 0) return colors.score.par.fill;
  if (toPar <= -2) return colors.score.eagle.fill;
  if (toPar < 0) return colors.score.birdie.fill;
  return colors.score.bogey.fill;
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
