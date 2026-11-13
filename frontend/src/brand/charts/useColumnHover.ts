import { useState, type MouseEvent, type PointerEvent } from "react";

/** The x scale a chart's columns sit on: a column's value maps to its left edge. */
type ColumnScale = { invert: (pixels: number) => number };

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

/**
 * Which point is picked, for a chart drawn as points (a round each): a mouse hovers the nearest,
 * a tap on a phone picks one and a second tap on it puts it down. `track` gives the plot's pointer
 * handlers, read back through the chart's x scale and clamped to the `count` points.
 */
export function usePointPick() {
  const [active, setActive] = useState<number | null>(null);
  const track = (x: ColumnScale, count: number, width: number) => {
    const indexAt = (e: PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const index = Math.round(x.invert((e.clientX - rect.left) * (width / rect.width)));
      return Math.max(0, Math.min(count - 1, index));
    };
    return {
      onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") setActive(indexAt(e));
      },
      onPointerLeave: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") setActive(null);
      },
      onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
        if (e.pointerType === "mouse") return;
        const index = indexAt(e);
        setActive(active === index ? null : index);
      },
    };
  };
  return { active, track };
}
