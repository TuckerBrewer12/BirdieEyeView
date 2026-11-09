import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { Sparkline, type SparklineTone } from "@/brand/charts/Sparkline";
import { Card, CardContent } from "./Card";
import { statDeltaVariants, statValueVariants, statVariants } from "./variants";

/**
 * A figure and what it measures: the scoring average, a handicap, a rate.
 *
 * The parts compose like `Card`, so a caller can put the label above the
 * value or under it. The caller formats the value; this owns the type.
 * `StatCard` sets them as a KPI tile.
 */
function Stat({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof statVariants>) {
  return (
    <div data-slot="stat" className={cn(statVariants({ align, className }))} {...props} />
  );
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      className={cn("text-body font-medium text-foreground-secondary", className)}
      {...props}
    />
  );
}

function StatValue({
  className,
  size = "md",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof statValueVariants>) {
  return (
    <div data-slot="stat-value" className={cn(statValueVariants({ size, className }))} {...props} />
  );
}

/** A unit after the value, set smaller and quieter: the `%` in 38%, the `HCP` after 12.4. */
function StatUnit({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-unit"
      className={cn("text-base font-semibold tracking-normal text-foreground-secondary", className)}
      {...props}
    />
  );
}

/** What a change is measured against: the "last 5 vs all" after a delta. */
function StatNote({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-note"
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

type StatDirection = "up" | "down" | "flat";
/** Whether the move was for the better: the server's verdict (`good`, `bad`, `neutral`). */
type StatTone = "good" | "bad" | "neutral";

const DIRECTION_GLYPHS = { up: "▲", down: "▼", flat: "–" } as const;

/**
 * Which way a figure moved: a triangle, and the amount beside it as children.
 * The arrow is the direction; the colour is `tone`, the server's verdict on
 * whether that move is for the better. `pill` sets it on a wash of its tone.
 */
function StatDelta({
  direction,
  tone,
  pill = false,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statDeltaVariants> & {
  direction: StatDirection | null;
  tone: StatTone;
}) {
  if (direction == null) return null;
  return (
    <span
      data-slot="stat-delta"
      data-direction={direction}
      data-tone={tone}
      className={cn(statDeltaVariants({ tone, pill, className }))}
      {...props}
    >
      <span aria-hidden>{DIRECTION_GLYPHS[direction]}</span>
      {children}
    </span>
  );
}

interface StatCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The figure across recent rounds, oldest first: drawn as a small line beside the value. */
  trend?: (number | null)[] | null;
  /** The amount it moved, beside the triangle. */
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  /** The server's verdict on the move: colours the delta and the trend line. */
  tone?: StatTone;
  /** What the delta is against ("last 5 vs all"), or a quiet line under the figure. */
  note?: React.ReactNode;
}

const TREND_TONE: Record<StatTone, SparklineTone> = { good: "good", bad: "bad", neutral: "primary" };

/** A KPI tile: the figure, its trend line, and how it moved against the last stretch. */
function StatCard({
  label,
  value,
  trend,
  delta,
  direction = null,
  tone = "neutral",
  note,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card data-slot="stat-card" size="sm" className={className} {...props}>
      <CardContent className="flex flex-col gap-2">
        <StatLabel>{label}</StatLabel>
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <StatValue size="lg">{value}</StatValue>
          {trend && (
            <Sparkline size="compact" className="mb-1 w-24 shrink-0" series={[{ values: trend, tone: TREND_TONE[tone] }]} />
          )}
        </div>
        {(direction != null || note != null) && (
          <div className="flex flex-wrap items-center gap-x-2">
            <StatDelta direction={direction} tone={tone}>
              {delta}
            </StatDelta>
            {note != null && <StatNote>{note}</StatNote>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { Stat, StatLabel, StatValue, StatUnit, StatNote, StatDelta, StatCard };
export type { StatDirection, StatTone };
