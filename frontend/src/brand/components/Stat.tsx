import * as React from "react";
import { cn } from "@/brand/cn";

/**
 * A figure with its caption underneath.
 *
 * Callers kept writing a `text-2xl` value and a `text-xs` label by hand. This
 * is the one place that type lives.
 */
function Stat({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="stat" className={cn(className)} {...props} />;
}

function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn("text-2xl font-bold text-foreground", className)}
      {...props}
    />
  );
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      className={cn("mt-0.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Stat, StatValue, StatLabel };
