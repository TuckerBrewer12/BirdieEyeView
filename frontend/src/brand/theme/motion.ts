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
  /** Points popping in along a drawn line, one after another, once it has nearly finished. */
  pop: { from: 0, delay: 1.2, stagger: 0.04, duration: 0.25, ease: "backOut" as const },
  /** Content arriving on load: a fast start and a long settle. */
  entrance: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  /** A block resizing into the space it has been given. */
  layout: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  /**
   * The landing page demo's cinematic timings, in seconds. Not interaction values: the sweep
   * is a scanner crossing a card, the crossfade one image replacing another, the tap a finger
   * pressing a button on a captured screen. Folding them into `hoverScale` or `collapse` would
   * erase the effect, so they stay a set of their own.
   */
  demo: {
    /** One image replacing another — the card giving way to the scorecard. */
    crossfade: 0.8,
    /** The scan line's full travel, top to bottom. */
    sweep: 1.5,
    /** A field or chip drawing the eye as the form fills itself in. */
    emphasis: 0.3,
    /** A choice registering, matching the kit's collapse. */
    select: 0.2,
    /** One on/off of the text caret in the name field. */
    caretBlink: 0.8,
    /** Mapped rows sliding in from the right. Looser than the kit's spring so
     *  the rows overshoot enough to read as dropped into place. */
    rowSpring: { type: "spring" as const, damping: 15 },
    /** One app screen giving way to the next on the tour. */
    screenChange: 0.5,
    /** The incoming screen settling from just past full size. */
    screenEnterScale: 1.02,
    /** The photo stepping back as the scanned card replaces it. */
    photoRecedeScale: 0.95,
    /** A finger pressing the handicap: the ring closing in from wide, pressing, then letting go. */
    tap: { duration: 0.7, reachScale: 1.6, pressScale: 0.8 },
  },
} as const;
