import { scoreKind } from "@/domain/score";
import { colors } from "./colors";

export type ScoreKey = keyof typeof colors.score;

/** Brand mapping of a hole onto score tokens. Unknowns read as par. */
export function scoreKeyFor(
  strokes: number | null,
  par: number | null,
): ScoreKey {
  return scoreKind(strokes, par) ?? "par";
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

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

/** Tailwind text color for a to-par figure: under par reads birdie, over reads bogey. */
export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}
