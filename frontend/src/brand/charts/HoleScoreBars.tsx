import { cn } from "@/brand/cn";
import { scoreFillClass, type ScoreKey } from "@/brand/theme";
import type { HoleScore } from "@/domain";

interface HoleScoreBarsProps {
  holes: HoleScore[];
  /** `strip` is one even row; `profile` stands each bar taller the worse the hole went. */
  variant?: "strip" | "profile";
  className?: string;
}

const PROFILE_HEIGHT: Record<ScoreKey, string> = {
  eagle: "h-7/25",
  birdie: "h-2/5",
  par: "h-13/25",
  bogey: "h-18/25",
  double: "h-23/25",
  triple: "h-full",
  quad: "h-full",
};

/** A round at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, variant = "strip", className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";

  return (
    <div
      data-slot="hole-score-bars"
      className={cn("flex", profile ? "h-6 items-end gap-hair" : "h-2.5 gap-bar", className)}
    >
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out. Unscored holes read as par.
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              "flex-1",
              scoreFillClass[kind],
              profile ? cn("rounded-t-tick", PROFILE_HEIGHT[kind]) : "rounded-bar",
              kind === "par" && "opacity-(--brand-opacity-recessed)",
            )}
          />
        );
      })}
    </div>
  );
}
