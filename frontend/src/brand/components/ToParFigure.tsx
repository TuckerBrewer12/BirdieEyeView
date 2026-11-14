import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { toParLabel, toParStatTextClass, toParTextClass } from "@/brand/theme";

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
