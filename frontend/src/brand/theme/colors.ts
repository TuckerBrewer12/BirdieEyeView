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
    eagle:  { fill: "var(--score-eagle-fill)",  onFill: "var(--score-eagle-on-fill)",  text: "var(--score-eagle-text)" },
    birdie: { fill: "var(--score-birdie-fill)", onFill: "var(--score-birdie-on-fill)", text: "var(--score-birdie-text)" },
    par:    { fill: "var(--score-par-fill)",    onFill: "var(--score-par-on-fill)",    text: "var(--score-par-text)" },
    bogey:  { fill: "var(--score-bogey-fill)",  onFill: "var(--score-bogey-on-fill)",  text: "var(--score-bogey-text)" },
    double: { fill: "var(--score-double-fill)", onFill: "var(--score-double-on-fill)", text: "var(--score-double-text)" },
    triple: { fill: "var(--score-triple-fill)", onFill: "var(--score-triple-on-fill)", text: "var(--score-triple-text)" },
    quad:   { fill: "var(--score-quad-fill)",   onFill: "var(--score-quad-on-fill)",   text: "var(--score-quad-text)" },
  },
} as const;
