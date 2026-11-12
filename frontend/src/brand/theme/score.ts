import { SCORE_KINDS, toParLabel, type ScoreKind } from "@/domain/score";
import { color } from "./tokens";

// The words are golf, so they live in the domain; the theme re-exports them beside the colours.
export { scoreKindLabel, toParLabel } from "@/domain/score";

/** Display order for legends and mix bars. Same set as `ScoreKind`. */
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

/**
 * A kind's colour for a line or a small mark: its base, but par's pale fill would fade on the card,
 * so par reads as quiet ink. `scoreMarkClass` is the same for a swatch beside the line.
 */
export function scoreMarkFill(key: ScoreKey): string {
  return key === "par" ? color.mutedForeground : color.score[key].base;
}

export function scoreMarkClass(key: ScoreKey): string {
  return key === "par" ? "bg-muted-foreground" : SCORE_FILL_CLASS[key];
}

/** Tailwind background for a hole's score chip. */
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

/** Tailwind text colour that reads on `scoreFillClass`. */
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

const SCORE_COUNT_TEXT_CLASS: Record<ScoreKey, string> = {
  eagle: "text-score-eagle",
  birdie: "text-score-birdie",
  // Pars are the baseline, so their count reads in ink.
  par: "text-foreground",
  bogey: "text-score-bogey",
  double: "text-score-double",
  triple: "text-score-triple",
  quad: "text-score-quad",
};

/** Tailwind text colour for how many holes of a kind a round had: the "7" in "7 bogeys". */
export function scoreCountTextClass(key: ScoreKey): string {
  return SCORE_COUNT_TEXT_CLASS[key];
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

/**
 * A server verdict as text ink: good in the brand's green, as every figure card on the soft
 * surface has it, bad like a bogey. Neutral, or no verdict, keeps the ink around it.
 */
export const VERDICT_TEXT = { good: "text-primary", bad: "text-score-bogey", neutral: "" } as const;

export function verdictTextClass(verdict: "good" | "bad" | "neutral" | null | undefined): string {
  return VERDICT_TEXT[verdict ?? "neutral"];
}

/** A server verdict as a fill, for SVG paint: good reads like a birdie, bad like a bogey, neutral as quiet ink. */
export function verdictFill(verdict: "good" | "bad" | "neutral" | null): string {
  if (verdict === "good") return color.score.birdie.base;
  if (verdict === "bad") return color.score.bogey.base;
  return color.mutedForeground;
}

/**
 * The same for a small mark on a chart (a sliver of bar, a dot): level reads as quiet ink rather
 * than par's pale fill, which a mark that small would lose on the card.
 */
export function toParMarkFill(toPar: number | null): string {
  return toParKind(toPar) === "par" ? color.mutedForeground : toParFill(toPar);
}

export function toParDisplay(toPar: number | null, empty = "—"): string {
  return toParLabel(toPar) ?? empty;
}

/** Tailwind text color for a to-par figure: under par reads birdie, over reads bogey. */
export function toParTextClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "text-muted-foreground";
  return toPar < 0 ? "text-score-birdie" : "text-score-bogey";
}

/** Tailwind text color for a round header's to-par: level par is a good round, so it reads birdie. */
export function toParStatTextClass(toPar: number): string {
  return toPar <= 0 ? "text-score-birdie" : "text-score-bogey";
}

/** Badge fill + text for a to-par figure on a history row. */
export function toParBadgeClass(toPar: number | null): string {
  if (toPar == null || toPar === 0) return "bg-muted text-muted-foreground";
  if (toPar < 0) return "bg-accent text-score-birdie";
  return "bg-destructive/10 text-score-bogey";
}
