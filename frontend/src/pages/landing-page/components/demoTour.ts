/**
 * The app screens the hero demo tours after a scan. Each is a capture of the real page,
 * taken by `tests/DemoTour.capture.spec.ts` against the sample golfer and served from
 * `public/demo-tour/`.
 */
export const TOUR_SCREENS = ["dashboard", "handicap", "analytics", "lab"] as const;
export type TourScreen = (typeof TOUR_SCREENS)[number];

/** Wide captures fill the square desktop frame; narrow ones the portrait phone frame. */
export const TOUR_LAYOUTS = {
  wide: { width: 1100, height: 1100, deviceScaleFactor: 1 },
  narrow: { width: 390, height: 520, deviceScaleFactor: 2 },
} as const;
export type TourLayout = keyof typeof TOUR_LAYOUTS;

/**
 * When the wide captures apply: where the demo frame stops being a portrait phone frame,
 * at its `sm:` classes. A `<source media>` can't read a CSS variable, and the kit has no
 * breakpoint token yet, so this mirrors Tailwind's `sm` (40rem) and must move with it.
 */
export const WIDE_FRAME_MEDIA = "(min-width: 40rem)";

export function tourImage(screen: TourScreen, layout: TourLayout): string {
  return `/demo-tour/${screen}-${layout}.png`;
}

/**
 * Where the dashboard's handicap sits in each capture, as a share of its width and
 * height, so the demo's tap lands on it. The capture spec fails if the page moves it.
 */
export const HANDICAP_TAP: Record<TourLayout, { x: number; y: number }> = {
  wide: { x: 0.898, y: 0.115 },
  narrow: { x: 0.869, y: 0.199 },
};
