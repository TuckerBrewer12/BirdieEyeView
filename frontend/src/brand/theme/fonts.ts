/**
 * Every brand typeface, as a reference to the token that holds its value.
 *
 * The values themselves live once, in `tokens.css`. These are `var()` strings,
 * so they resolve in CSS with no React involvement:
 *
 *     <div style={{ fontFamily: fonts.sans }} />
 *
 * In ordinary markup prefer the Tailwind utility — `font-sans` over
 * `style={{ fontFamily: fonts.sans }}`. Reach for this when a library takes a
 * style object and a static class cannot express it.
 *
 * `tokens.test.ts` fails if a name here has no definition in tokens.css.
 */
export const fonts = {
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
} as const;
