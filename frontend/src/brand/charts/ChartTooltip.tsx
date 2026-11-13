import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface ChartTooltipProps {
  /** What it shows, while it shows: a point's or a hole's key, so a new one fades in afresh. Null hides it. */
  id: string | number | null;
  /**
   * Where it points, as a share (0-1) of the chart across and down. Given `y`, it sits above that
   * point; left out, it hangs from the chart's top beside the column.
   */
  at: { x: number; y?: number };
  /** Past this share across it opens to the left, so it stays on the chart. */
  flipAt?: number;
  /** `sm` for a small chart's one-line card. */
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}

/**
 * A chart's hover card, one way for every chart: frosted over the plot, beside what it points at,
 * flipping to the left near the right edge, fading in and out. The chart passes where; the card's
 * words are the chart's own.
 */
export function ChartTooltip({ id, at, flipAt = tokens.chart.tooltipFlip, size = "default", className, children }: ChartTooltipProps) {
  const raised = at.y != null;
  return (
    <AnimatePresence>
      {id != null && (
        <motion.div
          key={id}
          data-slot="chart-tooltip"
          className={cn(
            "pointer-events-none absolute z-10 rounded-xl border border-border bg-card/glass shadow-card",
            size === "sm" ? "px-3 py-2 text-xs" : "px-3 py-2.5 text-body-sm",
            raised ? "-translate-y-full" : "top-0",
            at.x > flipAt ? "-ml-3 -translate-x-full" : "ml-3",
            className,
          )}
          style={{ left: `${at.x * 100}%`, top: raised ? `${(at.y ?? 0) * 100}%` : undefined }}
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
