import { cn } from "@/brand/cn";
import { scoreFillClass, type ScoreKey } from "@/brand/theme";
import type { HoleSummary } from "@/domain";

interface HoleScoreBarsProps {
  holes: HoleSummary[];
  /** `strip` is one even row; `profile` stands each bar taller the worse the hole went. */
  variant?: "strip" | "profile";
  /** The nines' strokes ("Out", "In"). With them the strip carries its first and last hole and both totals under it. */
  nines?: { out: number | null; in: number | null };
  className?: string;
}

const PROFILE_HEIGHT: Record<ScoreKey, string> = {
  eagle: "h-profile-eagle",
  birdie: "h-profile-birdie",
  par: "h-profile-par",
  bogey: "h-profile-bogey",
  double: "h-profile-double",
  triple: "h-profile-worse",
  quad: "h-profile-worse",
};

/** A round at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, variant = "strip", nines, className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;
  const profile = variant === "profile";

  const bars = (
    <div
      data-slot="hole-score-bars"
      className={cn("flex", profile ? "h-6 items-end gap-bar" : "h-2.5 gap-bar", className)}
    >
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out. Unscored holes read as par.
        const kind = hole.kind ?? "par";
        return (
          <div
            key={hole.hole}
            className={cn(
              "flex-1",
              scoreFillClass(kind),
              profile ? cn("rounded-t-tick", PROFILE_HEIGHT[kind]) : "rounded-bar",
              kind === "par" && "opacity-recessed",
            )}
          />
        );
      })}
    </div>
  );

  if (!nines) return bars;
  return (
    <div className="flex flex-col gap-2.5">
      {bars}
      <div aria-hidden className="flex justify-between text-label text-muted-foreground">
        <span>{holes[0].hole}</span>
        {nines.out != null && <span>Out {nines.out}</span>}
        {nines.in != null && <span>In {nines.in}</span>}
        <span>{holes[holes.length - 1].hole}</span>
      </div>
    </div>
  );
}
