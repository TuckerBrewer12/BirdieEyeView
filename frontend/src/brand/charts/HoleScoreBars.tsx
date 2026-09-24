import { cn } from "@/brand/cn";
import { scoreFill } from "@/brand/theme";

export interface HoleScore {
  hole: number;
  strokes: number | null;
  par: number | null;
}

interface HoleScoreBarsProps {
  holes: HoleScore[];
  className?: string;
}

/** A round at a glance: one bar per hole, coloured by how it was scored. */
export function HoleScoreBars({ holes, className }: HoleScoreBarsProps) {
  if (holes.length === 0) return null;

  return (
    <div data-slot="hole-score-bars" className={cn("flex h-2.5 gap-bar", className)}>
      {holes.map((hole) => {
        // Par is the baseline, so it recedes and the misses stand out.
        const isPar = hole.strokes == null || hole.par == null || hole.strokes === hole.par;
        return (
          <div
            key={hole.hole}
            className={cn("flex-1 rounded-bar", isPar && "opacity-(--brand-opacity-recessed)")}
            style={{ background: scoreFill(hole.strokes, hole.par) }}
          />
        );
      })}
    </div>
  );
}
