import { cn } from "@/brand/cn";
import { scoreFillClass, scoreProfileHeightClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

interface HoleScoreBarsProps {
  /** One nine's holes: a round's `frontNine.holes` or `backNine.holes`. */
  holes: HoleSummary[];
  /**
   * `nine` is the nine as nine even cells, so a short nine keeps its cells' width and a front
   * and a back nine line up side by side; `profile` stands each bar taller the worse the hole went.
   */
  variant?: "nine" | "profile";
  className?: string;
}

/** A nine at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, variant = "nine", className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";

  return (
    <div
      data-slot="hole-score-bars"
      className={cn(profile ? "flex h-6 items-end gap-bar" : "grid h-2 grid-cols-9 gap-chip", className)}
    >
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out. Unscored holes read as par.
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              scoreFillClass(kind),
              profile ? cn("flex-1 rounded-t-tick", scoreProfileHeightClass(kind)) : "rounded-tick",
              kind === "par" && "opacity-recessed",
            )}
          />
        );
      })}
    </div>
  );
}
