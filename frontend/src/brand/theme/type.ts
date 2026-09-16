/**
 * Type roles, as references to the tokens that hold their values.
 *
 * The values themselves live once, in `tokens.css`. These are `var()` strings
 * so they resolve in CSS with no React involvement. In ordinary markup prefer
 * the Tailwind utility — `text-caption` over `style={{ fontSize: typography.caption }}`.
 * Reach for this when a library takes a style object.
 *
 * `tokens.test.ts` fails if a name here has no definition in tokens.css.
 */
export const typography = {
  caption: "var(--brand-text-caption)",
  meta: "var(--brand-text-meta)",
  label: "var(--brand-text-label)",
  bodySm: "var(--brand-text-body-sm)",
  body: "var(--brand-text-body)",
  buttonSm: "var(--brand-text-button-sm)",
  title: "var(--brand-text-title)",
  hero: "var(--brand-text-hero)",
} as const;

export const tracking = {
  name: "var(--brand-tracking-name)",
  title: "var(--brand-tracking-title)",
  display: "var(--brand-tracking-display)",
  stat: "var(--brand-tracking-stat)",
  hero: "var(--brand-tracking-hero)",
  chip: "var(--brand-tracking-chip)",
  kicker: "var(--brand-tracking-kicker)",
  net: "var(--brand-tracking-net)",
  eyebrow: "var(--brand-tracking-eyebrow)",
  section: "var(--brand-tracking-section)",
} as const;

export const leading = {
  display: "var(--brand-leading-display)",
} as const;
