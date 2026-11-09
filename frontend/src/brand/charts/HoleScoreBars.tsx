import { cn } from "@/brand/cn";
import { scoreFillClass, scoreProfileHeightClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

interface HoleScoreBarsProps {
  /** One nine's holes (`frontNine.holes`), or with `strip`, the round's (`holes`). */
  holes: HoleSummary[];
  /**
   * `nine` is the nine as nine even cells, so a short nine keeps its cells' width and a front
   * and a back nine line up side by side; `strip` is the round as eighteen thin cells in one
   * row, par at full strength; `profile` stands each bar taller the worse the hole went.
   */
  variant?: "nine" | "strip" | "profile";
  className?: string;
}

/** A nine at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, variant = "nine", className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";
  const strip = variant === "strip";

  return (
    <div
      data-slot="hole-score-bars"
      className={cn(
        profile ? "flex h-6 items-end gap-bar" : strip ? "grid h-1.5 grid-cols-18 gap-0.5" : "grid h-2 grid-cols-9 gap-chip",
        className,
      )}
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
              kind === "par" && (strip ? "dark:opacity-recessed" : "opacity-recessed"),
            )}
          />
        );
      })}
    </div>
  );
}
