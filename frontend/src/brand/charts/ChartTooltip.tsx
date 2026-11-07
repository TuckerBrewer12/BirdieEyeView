import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";
import type { ChartTooltipAnchor } from "./useNearestPoint";

// Spelled out in full so Tailwind finds every class when it scans the source.
const SIZE = {
  default: "min-w-32 py-2.5 text-body-sm",
  /** A line or two, like a dot on the target. */
  sm: "py-2 text-xs",
};

interface ChartTooltipProps {
  /** Where the card is pinned (from `pointAnchor` or `useNearestPoint`). Null hides it. */
  anchor: ChartTooltipAnchor | null;
  /** `point` stands the card above the point it describes; `pointer` hangs it beside the mouse. */
  placement?: "point" | "pointer";
  /** What the card describes. Moving to another replays the entrance. */
  id: string | number;
  size?: keyof typeof SIZE;
  "data-slot"?: string;
  children: ReactNode;
}

/**
 * The card a chart shows for the point under the pointer, over the chart's box (which is
 * `relative`). It opens to the right of its anchor, or to the left when the anchor says to flip.
 */
export function ChartTooltip({
  anchor,
  placement = "point",
  id,
  size = "default",
  "data-slot": slot = "chart-tooltip",
  children,
}: ChartTooltipProps) {
  const { gap, pointerGap, pointerLift } = tokens.chart.tooltip;
  const side = placement === "pointer" ? pointerGap : gap;
  return (
    <AnimatePresence>
      {anchor && (
        <motion.div
          key={id}
          data-slot={slot}
          className={cn(
            "pointer-events-none absolute z-10 rounded-tooltip border border-border bg-card/glass px-3 shadow-card",
            SIZE[size],
            placement === "point" && "-translate-y-full",
            anchor.flip && "-translate-x-full",
          )}
          style={{
            left: anchor.left,
            top: anchor.top,
            marginLeft: anchor.flip ? -side : side,
            marginTop: placement === "pointer" ? -pointerLift : 0,
          }}
          initial={{ opacity: 0, scale: tokens.motion.tapScale }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: tokens.motion.tapScale }}
          transition={{ duration: tokens.motion.duration.collapse }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type { ChartTooltipProps };
