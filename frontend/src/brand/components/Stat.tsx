import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { Sparkline, type SparklineTone } from "@/brand/charts/Sparkline";
import { Card, CardContent } from "./Card";
import { statDeltaVariants, statLabelVariants, statValueVariants, statVariants } from "./variants";

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

function StatLabel({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof statLabelVariants>) {
  return <div data-slot="stat-label" className={cn(statLabelVariants({ tone, className }))} {...props} />;
}

function StatValue({
  className,
  size = "md",
  tone = "neutral",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof statValueVariants>) {
  return (
    <div data-slot="stat-value" className={cn(statValueVariants({ size, tone, className }))} {...props} />
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
  glyph = true,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statDeltaVariants> & {
  direction: StatDirection | null;
  tone: StatTone;
  /** Leave the triangle off where the amount's sign already says which way, as in "−2.4". */
  glyph?: boolean;
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
      {glyph && <span aria-hidden>{DIRECTION_GLYPHS[direction]}</span>}
      {children}
    </span>
  );
}

interface StatTileProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The figure across recent rounds, oldest first: drawn as a small line in the tile. */
  trend?: (number | null)[] | null;
  /** The amount it moved, beside the triangle. */
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  /** The server's verdict on the move: colours the delta and the trend line. */
  tone?: StatTone;
  /** What the delta is against ("last 5 vs all"), or a quiet line under the figure. */
  note?: React.ReactNode;
  /**
   * `card`: the line beside the value, the delta under it (a {@link StatCard}). `strip`: the delta
   * beside the value, the line across the tile under it, for a row of tiles in one card. `center`:
   * the value over its label and delta, centred, no line.
   */
  layout?: "card" | "strip" | "center";
}

const TREND_TONE: Record<StatTone, SparklineTone> = { good: "good", bad: "bad", neutral: "primary" };

/** A figure with its label, how it moved, and its line: the inside of a KPI tile, framed by whatever holds it. */
function StatTile({
  label,
  value,
  trend,
  delta,
  direction = null,
  tone = "neutral",
  note,
  layout = "card",
  className,
  ...props
}: StatTileProps) {
  const moved = direction != null || note != null;
  const move = moved && (
    <StatDelta direction={direction} tone={tone}>
      {delta}
    </StatDelta>
  );
  const line = (classes: string) =>
    trend &&
    trend.length > 1 && <Sparkline size="compact" className={classes} series={[{ values: trend, tone: TREND_TONE[tone] }]} />;

  if (layout === "center") {
    return (
      <div data-slot="stat-tile" className={cn("flex flex-col items-center gap-1", className)} {...props}>
        <StatValue>{value}</StatValue>
        <StatLabel>{label}</StatLabel>
        {move}
      </div>
    );
  }
  if (layout === "strip") {
    return (
      <div data-slot="stat-tile" className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
        <StatLabel>{label}</StatLabel>
        <div className="flex items-baseline gap-2">
          <StatValue size="lg">{value}</StatValue>
          {move}
        </div>
        {line("w-full")}
      </div>
    );
  }
  return (
    <div data-slot="stat-tile" className={cn("flex flex-col gap-2", className)} {...props}>
      <StatLabel>{label}</StatLabel>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <StatValue size="lg">{value}</StatValue>
        {line("mb-1 w-24 shrink-0")}
      </div>
      {moved && (
        <div className="flex flex-wrap items-center gap-x-2">
          {move}
          {note != null && <StatNote>{note}</StatNote>}
        </div>
      )}
    </div>
  );
}

type StatCardProps = Omit<StatTileProps, "layout">;

/** A KPI tile: the figure, its trend line, and how it moved against the last stretch. */
function StatCard({ className, ...props }: StatCardProps) {
  return (
    <Card data-slot="stat-card" size="sm" className={className}>
      <CardContent>
        <StatTile {...props} />
      </CardContent>
    </Card>
  );
}

export { Stat, StatLabel, StatValue, StatUnit, StatNote, StatDelta, StatTile, StatCard };
export type { StatDirection, StatTone };
