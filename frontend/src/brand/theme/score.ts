import { getScoreType } from "@/types/golf";
import { colors } from "./colors";

export function scoreFill(strokes: number | null, par: number | null): string {
  if (strokes == null || par == null) return colors.score.par.fill;
  const type = getScoreType(strokes, par);
  if (type === "double-bogey") return colors.score.double.fill;
  if (type === "worse") {
    return strokes - par >= 4 ? colors.score.quad.fill : colors.score.triple.fill;
  }
  return colors.score[type].fill;
}

export function toParLabel(toPar: number | null): string | null {
  if (toPar == null) return null;
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

export function toParColor(toPar: number | null, muted: string): string {
  if (toPar == null || toPar === 0) return muted;
  if (toPar < 0) return colors.score.birdie.text;
  return colors.score.bogey.text;
}
