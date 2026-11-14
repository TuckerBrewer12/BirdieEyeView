import { cn } from "@/brand/cn";
import { scoreFillClass, scoreProfileHeightClass } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

type PillSize = "sm" | "md" | "lg";

interface HoleScoreBarsProps {
  holes: HoleSummary[];
  variant?: "nine" | "strip" | "profile";
  size?: PillSize;
  className?: string;
}

const PILL_HEIGHT: Record<PillSize, string> = { sm: "h-2", md: "h-3", lg: "h-3.5" };

export function HoleScoreBars({ holes, variant = "nine", size, className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";
  const strip = variant === "strip";
  const pill = size;

  const layout = profile
    ? "flex h-6 items-end gap-bar"
    : cn(
        "grid",
        strip ? "grid-cols-18" : "grid-cols-9",
        pill
          ? cn(PILL_HEIGHT[pill], pill === "lg" ? "gap-1" : "gap-chip")
          : strip
            ? "h-1.5 gap-0.5 md:h-2"
            : "h-2 gap-chip",
      );

  return (
    <div data-slot="hole-score-bars" className={cn(layout, className)}>
      {holes.map((hole) => {
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              scoreFillClass(kind),
              profile ? cn("flex-1 rounded-t-tick", scoreProfileHeightClass(kind)) : pill ? "rounded-full" : "rounded-tick",
              kind === "par" && (pill || strip ? "dark:opacity-recessed" : "opacity-recessed"),
            )}
          />
        );
      })}
    </div>
  );
}
