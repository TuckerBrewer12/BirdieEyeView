import { cn } from "@/brand/cn";
import { colors } from "@/brand/theme";
import type { HoleResult } from "@/domain";

interface HoleScoreBarsProps {
  holes: HoleResult[];
  className?: string;
}

/** A round at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;

  return (
    <div data-slot="hole-score-bars" className={cn("flex h-2.5 gap-bar", className)}>
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out. Unscored holes read as par.
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn("flex-1 rounded-bar", kind === "par" && "opacity-(--brand-opacity-recessed)")}
            style={{ background: colors.score[kind].base }}
          />
        );
      })}
    </div>
  );
}
