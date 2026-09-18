import type { ScoreKind } from "@/domain/score";

/**
 * Every brand color, as a reference to the token that holds its value.
 *
 * The values themselves live once, in `tokens.css`. These are `var()` strings,
 * so they resolve in CSS and follow the color mode with no React involvement:
 *
 *     <div style={{ background: colors.card }} />
 *
 * In ordinary markup prefer the Tailwind utility — `bg-card` over
 * `style={{ background: colors.card }}`. Reach for this when the color is
 * dynamic and a static class cannot express it, as with a per-hole score fill.
 *
 * Because these are references and not literals, they do not work anywhere
 * that parses the string as a color — canvas, or a chart library that inspects
 * it. For those, resolve against the document:
 *
 *     getComputedStyle(document.documentElement).getPropertyValue("--card")
 *
 * `tokens.test.ts` fails if a name here has no definition in tokens.css.
 */
export type ScoreSwatch = {
  /** Saturated fill — bars, chips, filled score cells. */
  base: string;
  /** Light wash — table cells, history pills. */
  muted: string;
  /** Ink that sits on `base`. */
  onBase: string;
  /** Ink that sits on `muted`. */
  onMuted: string;
  /** Ink on the page background (`text-score-birdie`). */
  text: string;
};

export const colors = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  cardForeground: "var(--card-foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  secondaryForeground: "var(--secondary-foreground)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  destructive: "var(--destructive)",
  shadow: "var(--shadow)",

  score: {
    eagle:  { base: "var(--score-eagle-base)",  muted: "var(--score-eagle-muted)",  onBase: "var(--score-eagle-on-base)",  onMuted: "var(--score-eagle-on-muted)",  text: "var(--score-eagle-text)" },
    birdie: { base: "var(--score-birdie-base)", muted: "var(--score-birdie-muted)", onBase: "var(--score-birdie-on-base)", onMuted: "var(--score-birdie-on-muted)", text: "var(--score-birdie-text)" },
    par:    { base: "var(--score-par-base)",    muted: "var(--score-par-muted)",    onBase: "var(--score-par-on-base)",    onMuted: "var(--score-par-on-muted)",    text: "var(--score-par-text)" },
    bogey:  { base: "var(--score-bogey-base)",  muted: "var(--score-bogey-muted)",  onBase: "var(--score-bogey-on-base)",  onMuted: "var(--score-bogey-on-muted)",  text: "var(--score-bogey-text)" },
    double: { base: "var(--score-double-base)", muted: "var(--score-double-muted)", onBase: "var(--score-double-on-base)", onMuted: "var(--score-double-on-muted)", text: "var(--score-double-text)" },
    triple: { base: "var(--score-triple-base)", muted: "var(--score-triple-muted)", onBase: "var(--score-triple-on-base)", onMuted: "var(--score-triple-on-muted)", text: "var(--score-triple-text)" },
    quad:   { base: "var(--score-quad-base)",   muted: "var(--score-quad-muted)",   onBase: "var(--score-quad-on-base)",   onMuted: "var(--score-quad-on-muted)",   text: "var(--score-quad-text)" },
  } satisfies Record<ScoreKind, ScoreSwatch>,

  scanRow: {
    name: "var(--scan-row-name)",
    score: "var(--scan-row-score)",
    putts: "var(--scan-row-putts)",
    shots: "var(--scan-row-shots)",
  },

  demo: {
    cardHeader: "var(--demo-card-header)",
  },
} as const;
