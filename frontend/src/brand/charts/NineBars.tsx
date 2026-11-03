import { cn } from "@/brand/cn";
import { scoreFillClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

interface NineBarsProps {
  /** Up to nine holes: a front or a back nine. */
  holes: HoleSummary[];
  className?: string;
}

/** One nine as a row of nine bars, so a round reads as front and back. Par recedes; the misses stand out. */
export function NineBars({ holes, className }: NineBarsProps) {
  return (
    <div data-slot="nine-bars" className={cn("grid flex-1 grid-cols-9 gap-chip", className)}>
      {holes.map((hole) => {
        // Unscored holes read as par.
        const kind = hole.kind ?? "par";
        // Par is the pale score fill; on a dark card it would glare, so it sinks to the border there, as the board draws it.
        return (
          <div
            key={hole.hole}
            className={cn("h-2 rounded-tick", scoreFillClass(kind), kind === "par" && "dark:bg-border")}
          />
        );
      })}
    </div>
  );
}
