import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/brand/cn";
import { Sparkline, type SparklineTone } from "@/brand/charts/Sparkline";
import { statDeltaVariants, statLabelVariants, statValueVariants, statVariants } from "./variants";

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

function StatUnit({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-unit"
      className={cn("text-base font-semibold tracking-normal text-foreground-secondary", className)}
      {...props}
    />
  );
}

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
  trend?: (number | null)[] | null;
  delta?: React.ReactNode;
  direction?: StatDirection | null;
  tone?: StatTone;
  note?: React.ReactNode;
  layout?: "card" | "strip" | "center";
}

const TREND_TONE: Record<StatTone, SparklineTone> = { good: "good", bad: "bad", neutral: "primary" };

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

export { Stat, StatLabel, StatValue, StatUnit, StatNote, StatDelta, StatTile };
export type { StatDirection, StatTone };
