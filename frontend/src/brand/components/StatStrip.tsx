import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/brand/cn";
import { Sparkline } from "@/brand/charts/Sparkline";
import { RowButton } from "./Button";
import { StatDelta, StatLabel, StatValue, type StatDirection, type StatTone } from "./Stat";

/**
 * A run of figures in one card, split by hairlines: the dashboard's handicap, scoring average,
 * best round and rates. Each `StatStripItem` takes an equal share of the width.
 */
function StatStrip({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-strip"
      className={cn(
        "grid auto-cols-fr grid-flow-col overflow-hidden rounded-surface bg-card text-card-foreground shadow-surface",
        className,
      )}
      {...props}
    />
  );
}

interface StatStripItemProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The amount it moved, beside the triangle. */
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  /** The server's verdict on the move: colours the delta and the line. */
  tone?: StatTone;
  /** The figure across the window, oldest first. A figure without one keeps the line's room. */
  trend?: (number | null)[] | null;
  /** Opens what the figure is about, and marks the label with a chevron. */
  onClick?: () => void;
  className?: string;
}

const LINE_TONE = { good: "good", bad: "bad", neutral: "muted" } as const;

/** One figure in a `StatStrip`: its label, the value and its move, and a line under them. */
function StatStripItem({
  label,
  value,
  delta,
  direction = null,
  tone = "neutral",
  trend,
  onClick,
  className,
}: StatStripItemProps) {
  const content = (
    <>
      <StatLabel className="flex items-center gap-0.5 text-body-sm">
        {label}
        {onClick && <ChevronRight aria-hidden className="size-3" />}
      </StatLabel>
      <div className="flex items-baseline gap-2">
        <StatValue className="text-title font-semibold tracking-title">{value}</StatValue>
        <StatDelta direction={direction} tone={tone} className="font-semibold">
          {delta}
        </StatDelta>
      </div>
      <div className="h-6 w-30">
        {trend && <Sparkline size="strip" series={[{ values: trend, tone: LINE_TONE[tone] }]} />}
      </div>
    </>
  );
  const cell = cn("flex min-w-0 flex-col gap-1.5 px-4.5 pt-4 pb-3.5 not-first:border-l not-first:border-border", className);

  return onClick ? (
    <RowButton data-slot="stat-strip-item" onClick={onClick} className={cn(cell, "cursor-pointer hover:bg-muted/half")}>
      {content}
    </RowButton>
  ) : (
    <div data-slot="stat-strip-item" className={cell}>
      {content}
    </div>
  );
}

export { StatStrip, StatStripItem };
export type { StatStripItemProps };
