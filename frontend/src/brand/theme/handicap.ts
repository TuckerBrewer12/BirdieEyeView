import type { DifferentialStatus } from "@/domain/handicap";

// Spelled out in full so Tailwind finds every class when it scans the source.
const DIFFERENTIAL_FILL_CLASS: Record<DifferentialStatus, string> = {
  counting: "fill-score-birdie-base",
  close: "fill-score-eagle-base",
  out: "fill-destructive",
  unrated: "fill-score-par-base",
};

/** The SVG fill for a round's differential bar, from where it stands in the WHS window. */
export function differentialFillClass(status: DifferentialStatus): string {
  return DIFFERENTIAL_FILL_CLASS[status];
}
