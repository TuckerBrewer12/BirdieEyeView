import type { ScoreKind } from "@/domain/score";

export type ScoreSwatch = {
  base: string;
  muted: string;
  onBase: string;
  onMuted: string;
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

  sidebar: {
    base: "var(--sidebar)",
    end: "var(--sidebar-end)",
    foreground: "var(--sidebar-foreground)",
  },

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
