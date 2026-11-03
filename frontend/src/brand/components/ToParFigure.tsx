import { cn } from "@/brand/cn";
import { toParDisplay, toParLabel, toParTextClass } from "@/brand/theme";

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
