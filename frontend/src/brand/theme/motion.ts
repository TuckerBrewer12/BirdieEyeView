/**
 * Motion numbers for APIs that cannot take a CSS var (Framer Motion).
 *
 * Hover/tap scale and spring physics are not expressible as Tailwind
 * utilities. Import these instead of repeating raw numbers in components.
 */
export const motion = {
  hoverScale: 1.015,
  tapScale: 0.98,
  spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  duration: { collapse: 0.2 },
  /** A chart line drawing itself in. */
  draw: { duration: 1.4, ease: "easeInOut" as const },
  /** Already finished — reduced motion has nothing to play. */
  instant: { duration: 0 },
  /** Points popping in along a drawn line, one after another, once it has nearly finished. */
  pop: { delay: 1.2, stagger: 0.04, duration: 0.25, ease: "backOut" as const },
} as const;
