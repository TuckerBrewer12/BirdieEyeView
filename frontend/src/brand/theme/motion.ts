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
} as const;
