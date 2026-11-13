import { useState, type MouseEvent } from "react";

/** The x scale a chart's columns sit on: a column's value maps to its left edge. */
export type ColumnScale = { invert: (pixels: number) => number };

/**
 * Which column the pointer is over, for a chart drawn in columns (a hole each, or a round each).
 * `track` gives the plot's mouse handlers: the pointer's place across the drawing, read back through
 * the chart's x scale and clamped to the columns from `first` to `last`; leaving the plot clears it.
 */
export function useColumnHover() {
  const [hovered, setHovered] = useState<number | null>(null);
  const track = (x: ColumnScale, first: number, last: number, width: number) => ({
    onMouseMove: (e: MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const at = Math.floor(x.invert((e.clientX - rect.left) * (width / rect.width)));
      setHovered(Math.max(first, Math.min(last, at)));
    },
    onMouseLeave: () => setHovered(null),
  });
  return { hovered, track };
}
