import { cn } from "@/brand/cn";
import { scoreFillClass, scoreProfileHeightClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

type PillSize = "sm" | "md" | "lg";

interface HoleScoreBarsProps {
  /** One nine's holes (`frontNine.holes`), or with `strip`, the round's (`holes`). */
  holes: HoleSummary[];
  /**
   * `nine` is the nine as nine even cells, so a short nine keeps its cells' width and a front
   * and a back nine line up side by side; `strip` is the round as eighteen cells in one row;
   * `profile` stands each bar taller the worse the hole went.
   */
  variant?: "nine" | "strip" | "profile";
  /**
   * Draws the cells as pills, par at full strength: `sm` 8px tall (a row in a list of rounds),
   * `md` 12px (a phone's last round), `lg` 14px (the last round's nines). A strip is always pills.
   */
  size?: PillSize;
  className?: string;
}

const PILL_HEIGHT: Record<PillSize, string> = { sm: "h-2", md: "h-3", lg: "h-3.5" };

/** A nine, or a round, at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, variant = "nine", size, className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";
  const strip = variant === "strip";
  const pill = strip ? (size ?? "sm") : size;

  const layout = profile
    ? "flex h-6 items-end gap-bar"
    : cn(
        "grid",
        strip ? "grid-cols-18" : "grid-cols-9",
        pill ? cn(PILL_HEIGHT[pill], pill === "lg" ? "gap-1" : "gap-0.75") : "h-2 gap-chip",
      );

  return (
    <div data-slot="hole-score-bars" className={cn(layout, className)}>
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out. Unscored holes read as par.
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              scoreFillClass(kind),
              profile ? cn("flex-1 rounded-t-tick", scoreProfileHeightClass(kind)) : pill ? "rounded-full" : "rounded-tick",
              // Pills keep par at full strength on a light card; a dark one would glare.
              kind === "par" && (pill ? "dark:opacity-recessed" : "opacity-recessed"),
            )}
          />
        );
      })}
    </div>
  );
}
