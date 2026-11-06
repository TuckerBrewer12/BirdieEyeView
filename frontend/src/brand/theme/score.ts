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

/** A score's light wash and the ink that reads on it, for a tag or tooltip. */
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

/** Tailwind height for a hole's bar in a round profile: the worse the hole went, the taller it stands. */
export function scoreProfileHeightClass(key: ScoreKey): string {
  return SCORE_PROFILE_HEIGHT_CLASS[key];
}

/**
 * The score colour for a round's to-par, not a hole's. Even and missing recede
 * as par; a round does not earn eagle/quad the way a hole does.
 */
function toParKind(toPar: number | null): "eagle" | "birdie" | "par" | "bogey" {
  if (toPar == null || toPar === 0) return "par";
  if (toPar <= -2) return "eagle";
  if (toPar < 0) return "birdie";
  return "bogey";
}

/** A round's to-par as a fill colour, for SVG paint and chart-library props. */
export function toParFill(toPar: number | null): string {
  return color.score[toParKind(toPar)].base;
}

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}

/** Tailwind text color for a round header's to-par: level par is a good round, so it reads birdie. */
export function toParStatTextClass(toPar: number): string {
  return toPar <= 0 ? "text-score-birdie" : "text-score-bogey";
}

export function toParBadgeClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "bg-muted text-muted-foreground";
  if (toPar < 0) return "bg-accent text-score-birdie";
  return "bg-destructive/10 text-score-bogey";
}
