import { SCORE_KINDS, toParLabel, type ScoreKind } from "@/domain/score";

export { scoreKindLabel, toParLabel } from "@/domain/score";
import { colors, type ScoreSwatch } from "./colors";

export const SCORE_KEYS = SCORE_KINDS;

export type ScoreKey = ScoreKind;

export type ScoreTone = ScoreSwatch;

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

export function scoreFillClass(key: ScoreKey): string {
  return SCORE_FILL_CLASS[key];
}

export function toParTone(toPar: number | null): ScoreTone {
  if (toPar == null || toPar === 0) return colors.score.par;
  if (toPar <= -2) return colors.score.eagle;
  if (toPar < 0) return colors.score.birdie;
  return colors.score.bogey;
}

export function toParFill(toPar: number | null): string {
  return toParTone(toPar).base;
}

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}

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

export function scoreOnFillClass(key: ScoreKey): string {
  return SCORE_ON_FILL_CLASS[key];
}
