import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface ChartTooltipProps {
  id: string | number | null;
  at: { x: number; y?: number };
  flipAt?: number;
  size?: "default" | "sm";
  className?: string;
  children: ReactNode;
}

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
