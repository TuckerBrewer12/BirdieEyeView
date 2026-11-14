import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { toParLabel, toParStatTextClass, toParTextClass } from "@/brand/theme";

/**
 * A to-par figure. The score colour lives here; callers pass the number.
 *
 * `figure` is the small caption under a score (`text-body-sm`, even par recedes). `stat` is the round
 * header, where level par reads as birdie. `inherit` takes the type of what it sits in, like a
 * scorecard cell or a line of small print, and only adds the colour.
 *
 * `label` words it when the whole-number label won't do: an average to a tenth ("+0.5"), or a
 * sentence about the to par ("1.2 strokes behind"). The colour still follows `toPar`.
 */
function ToParFigure({
  toPar,
  size = "figure",
  label,
  empty,
  className,
}: {
  toPar: number | null;
  size?: "figure" | "stat" | "inherit";
  label?: ReactNode;
  /** Shown, quiet, when there is no to par: a scorecard's "-". Left out, nothing renders. */
  empty?: string;
  className?: string;
}) {
  if (toPar == null) {
    if (empty == null) return null;
    return (
      <span data-slot="to-par-figure" className={cn("text-muted-foreground", className)}>
        {empty}
      </span>
    );
  }
  const words = label ?? toParLabel(toPar);
  const tone = size === "stat" ? toParStatTextClass(toPar) : toParTextClass(toPar);

  return (
    <span
      data-slot="to-par-figure"
      className={cn(
        size === "stat" && "mt-0.5 font-mono text-sm font-bold",
        size === "figure" && "mt-0.5 text-body-sm font-semibold",
        tone,
        className
      )}
    >
      {words}
    </span>
  );
}

export { ToParFigure };
