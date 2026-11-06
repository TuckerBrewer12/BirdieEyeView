import { fromBreakpoint } from "@/brand/theme";

export const TOUR_SCREENS = ["dashboard", "handicap", "analytics", "lab"] as const;
export type TourScreen = (typeof TOUR_SCREENS)[number];

export const TOUR_LAYOUTS = {
  wide: { width: 1100, height: 1100, deviceScaleFactor: 1 },
  narrow: { width: 390, height: 520, deviceScaleFactor: 2 },
} as const;
export type TourLayout = keyof typeof TOUR_LAYOUTS;

export const WIDE_FRAME_MEDIA = fromBreakpoint("sm");

export function tourImage(screen: TourScreen, layout: TourLayout): string {
  return `/demo-tour/${screen}-${layout}.png`;
}

export const HANDICAP_TAP: Record<TourLayout, { x: number; y: number }> = {
  wide: { x: 0.898, y: 0.115 },
  narrow: { x: 0.869, y: 0.199 },
};
