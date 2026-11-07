import { useState, type PointerEvent } from "react";
import { tokens } from "@/brand/theme";

/** Where a {@link ChartTooltip} is pinned inside the chart's box. */
export interface ChartTooltipAnchor {
  /** From the box's left and top edges: pixels, or a percentage string. */
  left: number | string;
  top: number | string;
  /** The card opens to the left of the anchor, so it stays inside the chart. */
  flip: boolean;
}

/** A plotted point's anchor, from its place in a drawing `width` by `height` in the chart's own units. */
export function pointAnchor(
  x: number,
  y: number,
  width: number,
  height: number,
  flipAt: number = tokens.chart.tooltip.flipAt,
): ChartTooltipAnchor {
  return { left: `${(x / width) * 100}%`, top: `${(y / height) * 100}%`, flip: x / width > flipAt };
}

interface Pick {
  scope: string;
  index: number;
  pointer: ChartTooltipAnchor;
}

/**
 * The point nearest the pointer across a chart. A mouse picks by hovering and drops it on
 * leaving; a tap picks a point and a second tap on it puts it down. A pick belongs to its
 * `scope`, so switching what the chart draws clears it.
 */
export function useNearestPoint(scope = "") {
  const [pick, setPick] = useState<Pick | null>(null);
  const current = pick?.scope === scope ? pick : null;

  /** The listeners for the chart's `<svg>`: `xs` are the points across it, in a drawing `width` wide. */
  const svgProps = (xs: number[], width: number) => {
    const locate = (event: PointerEvent<SVGSVGElement>): Pick => {
      const rect = event.currentTarget.getBoundingClientRect();
      const left = event.clientX - rect.left;
      const at = left * (width / rect.width);
      let index = 0;
      xs.forEach((x, i) => {
        if (Math.abs(x - at) < Math.abs(xs[index] - at)) index = i;
      });
      const pointer = { left, top: event.clientY - rect.top, flip: left / rect.width > tokens.chart.tooltip.flipAt };
      return { scope, index, pointer };
    };
    return {
      onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "mouse") setPick(locate(event));
      },
      onPointerLeave: (event: PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "mouse") setPick(null);
      },
      onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "mouse") return;
        const next = locate(event);
        setPick(current?.index === next.index ? null : next);
      },
    };
  };

  return {
    /** The picked point's index, or null. */
    active: current?.index ?? null,
    /** Where the pointer was when it picked, for a card that hangs beside it. */
    pointer: current?.pointer ?? null,
    svgProps,
  };
}
