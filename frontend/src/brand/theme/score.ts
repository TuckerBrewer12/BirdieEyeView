import { getScoreType } from "@/types/golf";
import { colors } from "./colors";

export type ScoreKey = keyof typeof colors.score;

/** Buckets a raw score into the seven brand score keys. Unknowns read as par. */
export function scoreKeyFor(
  strokes: number | null,
  par: number | null,
): ScoreKey {
  if (strokes == null || par == null) return "par";
  const type = getScoreType(strokes, par);
  if (type === "double-bogey") return "double";
  if (type === "worse") return strokes - par >= 4 ? "quad" : "triple";
  return type;
}

/** The fill token for a hole, for the cases a static class cannot express. */
export function scoreFill(
  strokes: number | null,
  par: number | null,
): string {
  return colors.score[scoreKeyFor(strokes, par)].fill;
}

export function toParLabel(toPar: number | null): string | null {
  if (toPar == null) return null;
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

/** Tailwind text color for a to-par figure: under par reads birdie, over reads bogey. */
export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}
