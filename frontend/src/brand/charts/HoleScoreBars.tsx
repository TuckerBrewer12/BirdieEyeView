import { cn } from "@/brand/cn";
import { scoreFillClass, scoreProfileHeightClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

interface HoleScoreBarsProps {
  holes: HoleSummary[];
  variant?: "strip" | "profile";
  className?: string;
}

export function HoleScoreBars({ holes, variant = "strip", className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";

  return (
    <div
      data-slot="hole-score-bars"
      className={cn("flex", profile ? "h-6 items-end gap-bar" : "h-2.5 gap-bar", className)}
    >
      {holes.map((hole) => {
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              "flex-1",
              scoreFillClass(kind),
              profile ? cn("rounded-t-tick", scoreProfileHeightClass(kind)) : "rounded-bar",
              kind === "par" && "opacity-recessed",
            )}
          />
        );
      })}
    </div>
  );
}
