import { cn } from "@/brand/cn";
import { toParDisplay, toParLabel, toParTextClass } from "@/brand/theme";

/**
 * A to-par figure. The type and the score color live here; callers pass the
 * number.
 *
 * `figure` is the small caption under a score (`text-body-sm`, even par
 * recedes). `stat` is the round header, where level par reads as birdie.
 */
function ToParFigure({
  toPar,
  size = "figure",
  className,
}: {
  toPar: number | null;
  size?: "figure" | "stat";
  className?: string;
}) {
  if (toPar == null) return null;
  const label = size === "stat" ? toParDisplay(toPar, "-") : toParLabel(toPar);
  if (!label) return null;

  const tone = size === "stat"
    ? toPar <= 0 ? "text-score-birdie" : "text-score-bogey"
    : toParTextClass(toPar);

  return (
    <span
      data-slot="to-par-figure"
      className={cn(
        "mt-0.5 font-semibold",
        size === "stat" ? "font-mono text-sm font-bold" : "text-body-sm",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}

export { ToParFigure };
