import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { Meter } from "./Meter";
import { statValueVariants, statVariants } from "./variants";

/**
 * A figure and what it measures: the scoring average, a handicap, a rate.
 *
 * The parts compose like `Card`, so a caller can put the label above the
 * value or under it. The caller formats the value; this owns the type.
 * `StatCard` is the same parts set as a KPI tile.
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

/** The span a figure covers, set small and quiet: the `L20` at a tile's corner. */
function StatPeriod({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-period"
      className={cn("text-label text-muted-foreground", className)}
      {...props}
    />
  );
}

/** What a change is measured against: the "vs previous 20" after a delta. */
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
type StatTone = "good" | "bad" | "neutral";

const DIRECTION_GLYPHS = { up: "▲", down: "▼", flat: "–" } as const;

/** Scores, handicaps and putts improve as they fall, so by default down is good and up is bad. */
const DIRECTION_TONES: Record<StatDirection, StatTone> = {
  down: "good",
  up: "bad",
  flat: "neutral",
};

const TONE_CLASSES: Record<StatTone, string> = {
  good: "text-status-success",
  bad: "text-status-danger",
  neutral: "text-muted-foreground",
};

/**
 * Which way a figure moved: a triangle, and the amount beside it as children.
 * The colour says whether that is for the better. Scores, handicaps and putts
 * improve as they fall, so down reads green and up red; a rate that improves
 * as it rises (greens hit) passes `tone="good"` for its up.
 */
function StatDelta({
  direction,
  tone,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { direction: StatDirection | null; tone?: StatTone }) {
  if (direction == null) return null;
  const resolved = tone ?? DIRECTION_TONES[direction];
  return (
    <span
      data-slot="stat-delta"
      data-direction={direction}
      data-tone={resolved}
      className={cn(
        "inline-flex items-center gap-1 text-body-sm font-bold whitespace-nowrap",
        TONE_CLASSES[resolved],
        className,
      )}
      {...props}
    >
      <span aria-hidden>{DIRECTION_GLYPHS[direction]}</span>
      {children}
    </span>
  );
}

interface StatCardProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode;
  /** The span the figure covers, top right: `L20`. */
  period?: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /** A `StatTrend`, to the right of the figure. */
  trend?: React.ReactNode;
  /** The amount it moved, beside the triangle. */
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  /** Whether the move is for the better. Defaults from the direction. */
  tone?: StatTone;
  /** What the delta is against: "vs previous 20". */
  note?: React.ReactNode;
}

/** A KPI tile: the figure, its trend line, and how it moved against the last stretch. */
function StatCard({
  label,
  period,
  value,
  unit,
  trend,
  delta,
  direction = null,
  tone,
  note,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex flex-col gap-1.5 rounded-tile border border-border bg-card px-4.5 py-4 text-card-foreground",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <StatLabel>{label}</StatLabel>
        {period != null && <StatPeriod>{period}</StatPeriod>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <StatValue size="lg">
          {value}
          {unit != null && <StatUnit>{unit}</StatUnit>}
        </StatValue>
        {trend != null && <div className="mb-1 flex">{trend}</div>}
      </div>
      {(direction != null || note != null) && (
        <div className="flex items-center gap-1.5">
          <StatDelta direction={direction} tone={tone}>
            {delta}
          </StatDelta>
          {note != null && <StatNote>{note}</StatNote>}
        </div>
      )}
    </div>
  );
}

/** A row of figures in one panel, split by rules: the stat strip. Takes `StatStripItem`s. */
function StatStrip({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-strip"
      className={cn(
        "grid auto-cols-fr grid-flow-col divide-x divide-border overflow-hidden rounded-tile border border-border bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

interface StatStripItemProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The amount it moved, beside the triangle. */
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  /** Whether the move is for the better. Defaults from the direction. */
  tone?: StatTone;
  /** Where the figure sits in its range, 0–100, drawn as a bar. */
  meter?: number | null;
  /** The line under the bar: the range, a per-round figure. */
  detail?: React.ReactNode;
}

/** One figure in a `StatStrip`: label, value and its move, a bar for where it sits, and a detail line. */
function StatStripItem({
  label,
  value,
  delta,
  direction = null,
  tone,
  meter,
  detail,
  className,
  ...props
}: StatStripItemProps) {
  const resolved = direction == null ? "neutral" : (tone ?? DIRECTION_TONES[direction]);
  return (
    <div data-slot="stat-strip-item" className={cn("flex flex-col gap-1.5 px-5 py-4.5", className)} {...props}>
      <StatLabel className="text-body-sm">{label}</StatLabel>
      <div className="flex items-baseline gap-2">
        <StatValue className="text-figure leading-tight">{value}</StatValue>
        <StatDelta
          direction={direction}
          tone={tone}
          className={cn("font-semibold", resolved === "good" && "text-primary")}
        >
          {delta}
        </StatDelta>
      </div>
      {meter !== undefined && (
        <Meter value={meter} size="xs" tone={resolved === "bad" ? "danger" : "primary"} className="mt-1.5" />
      )}
      {detail != null && <div className="text-label text-muted-foreground">{detail}</div>}
    </div>
  );
}

export { Stat, StatLabel, StatValue, StatUnit, StatPeriod, StatNote, StatDelta, StatCard, StatStrip, StatStripItem };
export type { StatDirection, StatTone };
