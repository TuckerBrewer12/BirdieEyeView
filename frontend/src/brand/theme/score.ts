import { SCORE_KINDS, toParLabel, type ScoreKind } from "@/domain/score";
import { color } from "./tokens";

export { scoreKindLabel, toParLabel } from "@/domain/score";

export const SCORE_KEYS = SCORE_KINDS;

export type ScoreKey = ScoreKind;

// Every lookup below is spelled out in full so Tailwind finds each class when it scans the source.

const SCORE_FILL_CLASS: Record<ScoreKey, string> = {
  eagle: "bg-score-eagle-base",
  birdie: "bg-score-birdie-base",
  par: "bg-score-par-base",
  bogey: "bg-score-bogey-base",
  double: "bg-score-double-base",
  triple: "bg-score-triple-base",
  quad: "bg-score-quad-base",
};

export function scoreMarkFill(key: ScoreKey): string {
  return key === "par" ? color.mutedForeground : color.score[key].base;
}

export function scoreMarkClass(key: ScoreKey): string {
  return key === "par" ? "bg-muted-foreground" : SCORE_FILL_CLASS[key];
}

export function scoreFillClass(key: ScoreKey): string {
  return SCORE_FILL_CLASS[key];
}

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

const SCORE_WASH_CLASS: Record<ScoreKey, string> = {
  eagle: "bg-score-eagle-muted text-score-eagle-on-muted",
  birdie: "bg-score-birdie-muted text-score-birdie-on-muted",
  par: "bg-score-par-muted text-score-par-on-muted",
  bogey: "bg-score-bogey-muted text-score-bogey-on-muted",
  double: "bg-score-double-muted text-score-double-on-muted",
  triple: "bg-score-triple-muted text-score-triple-on-muted",
  quad: "bg-score-quad-muted text-score-quad-on-muted",
};

export function scoreWashClass(key: ScoreKey): string {
  return SCORE_WASH_CLASS[key];
}

const SCORE_PROFILE_HEIGHT_CLASS: Record<ScoreKey, string> = {
  eagle: "h-profile-eagle",
  birdie: "h-profile-birdie",
  par: "h-profile-par",
  bogey: "h-profile-bogey",
  double: "h-profile-double",
  triple: "h-profile-worse",
  quad: "h-profile-worse",
};

export function scoreProfileHeightClass(key: ScoreKey): string {
  return SCORE_PROFILE_HEIGHT_CLASS[key];
}

const SCORE_COUNT_TEXT_CLASS: Record<ScoreKey, string> = {
  eagle: "text-score-eagle",
  birdie: "text-score-birdie",
  par: "text-foreground",
  bogey: "text-score-bogey",
  double: "text-score-double",
  triple: "text-score-triple",
  quad: "text-score-quad",
};

export function scoreCountTextClass(key: ScoreKey): string {
  return SCORE_COUNT_TEXT_CLASS[key];
}

function toParKind(toPar: number | null): "eagle" | "birdie" | "par" | "bogey" {
  if (toPar == null || toPar === 0) return "par";
  if (toPar <= -2) return "eagle";
  if (toPar < 0) return "birdie";
  return "bogey";
}

export function toParFill(toPar: number | null): string {
  return color.score[toParKind(toPar)].base;
}

export const VERDICT_TEXT = { good: "text-primary", bad: "text-score-bogey", neutral: "" } as const;

export function verdictTextClass(verdict: "good" | "bad" | "neutral" | null | undefined): string {
  return VERDICT_TEXT[verdict ?? "neutral"];
}

export function verdictFill(verdict: "good" | "bad" | "neutral" | null): string {
  if (verdict === "good") return color.score.birdie.base;
  if (verdict === "bad") return color.score.bogey.base;
  return color.mutedForeground;
}

export function toParMarkFill(toPar: number | null): string {
  return toParKind(toPar) === "par" ? color.mutedForeground : toParFill(toPar);
}

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}

export function toParStatTextClass(toPar: number): string {
  return toPar <= 0 ? "text-score-birdie" : "text-score-bogey";
}

