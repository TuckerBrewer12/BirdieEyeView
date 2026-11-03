export const motion = {
  hoverScale: 1.015,
  tapScale: 0.98,
  spring: { type: "spring" as const, stiffness: 400, damping: 30 },
  duration: { collapse: 0.2 },
  draw: { duration: 1.4, ease: "easeInOut" as const },
  pop: { from: 0, delay: 1.2, stagger: 0.04, duration: 0.25, ease: "backOut" as const },
  entrance: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
} as const;
