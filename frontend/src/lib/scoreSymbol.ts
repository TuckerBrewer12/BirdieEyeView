import type { CSSProperties } from "react";
import { scoreKind } from "@/domain/score";
import { colors, scoreTone, type ScoreKey } from "@/brand/theme";
export const SCORE_SYMBOL_COLORS = {
  eagle:  { bg: colors.score.eagle.fill,  fg: colors.score.eagle.onFill },
  birdie: { bg: colors.score.birdie.fill, fg: colors.score.birdie.onFill },
  par:    { bg: colors.score.par.fill,    fg: colors.score.par.onFill },
  bogey:  { bg: colors.score.bogey.fill,  fg: colors.score.bogey.onFill },
  double: { bg: colors.score.double.fill, fg: colors.score.double.onFill },
  triple: { bg: colors.score.triple.fill, fg: colors.score.triple.onFill },
} as const;

function keyFromDiff(diff: number): ScoreKey {
  return scoreKind(diff, 0) ?? "par";
}

/** Inline styles for an editable input cell (circle/square via border-radius + box-shadow). */
export function scoreInputStyle(diff: number | null): CSSProperties {
  if (diff === null) {
    return { background: colors.card, borderRadius: 4, border: `1px solid ${colors.border}`, color: colors.foreground };
  }
  const tone = scoreTone(keyFromDiff(diff));
  if (diff <= -2) {
    return {
      background: tone.fill, color: tone.onFill, borderRadius: "50%", border: "none",
      boxShadow: `0 0 0 2px ${colors.card}, 0 0 0 4px ${tone.fill}`,
    };
  }
  if (diff === -1) {
    return { background: tone.fill, color: tone.onFill, borderRadius: "50%", border: "none" };
  }
  if (diff === 0) {
    return { background: tone.fill, color: tone.onFill, borderRadius: 4, border: "none" };
  }
  if (diff === 1) {
    return { background: tone.fill, color: tone.onFill, borderRadius: 2, border: "none" };
  }
  if (diff === 2) {
    return {
      background: tone.fill, color: tone.onFill, borderRadius: 2, border: "none",
      boxShadow: `0 0 0 2px ${colors.card}, 0 0 0 4px ${tone.fill}`,
    };
  }
  return {
    background: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.28) 5px, rgba(255,255,255,0.28) 7px), ${tone.fill}`,
    color: tone.onFill, borderRadius: 2, border: "none",
  };
}
