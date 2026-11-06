import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/brand/cn";
import { statValueVariants, statVariants } from "./variants";

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
      className={cn("text-eyebrow uppercase text-muted-foreground", className)}
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

function StatUnit({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="stat-unit"
      className={cn("text-sm font-semibold tracking-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

type StatDirection = "up" | "down" | "flat";

const DIRECTION_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;

const DIRECTION_TONES: Record<StatDirection, string> = {
  down: "text-score-birdie",
  up: "text-score-bogey",
  flat: "text-muted-foreground",
};

function StatDelta({
  direction,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { direction: StatDirection | null }) {
  if (direction == null) return null;
  const Icon = DIRECTION_ICONS[direction];
  return (
    <span
      data-slot="stat-delta"
      data-direction={direction}
      className={cn(
        "inline-flex items-center gap-1 text-label font-semibold whitespace-nowrap",
        DIRECTION_TONES[direction],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className={children == null ? "size-4" : "size-icon-xs"} />
      {children}
    </span>
  );
}

export { Stat, StatLabel, StatValue, StatUnit, StatDelta };
export type { StatDirection };
