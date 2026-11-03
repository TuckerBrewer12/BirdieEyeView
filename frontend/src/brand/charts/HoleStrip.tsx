import { cn } from "@/brand/cn";
import { scoreFillClass, type ScoreKey } from "@/brand/theme";
import { playedScoreKinds, scoreKindCountLabel } from "@/domain/score";
import type { HoleSummary } from "@/domain";

interface HoleStripProps {
  /** In hole order. */
  holes: HoleSummary[];
  /** The strokes over the front nine ("Out"), shown under the strip when given. */
  front?: number | null;
  /** The strokes over the back nine ("In"), shown under the strip when given. */
  back?: number | null;
  className?: string;
}

/** A round at a glance: one cell per hole in the colour of its score, with the nines' strokes under it. */
export function HoleStrip({ holes, front, back, className }: HoleStripProps) {
  if (holes.length === 0) return null;

  const tally: Partial<Record<ScoreKey, number>> = {};
  for (const hole of holes) if (hole.kind) tally[hole.kind] = (tally[hole.kind] ?? 0) + 1;
  const counts = playedScoreKinds(tally);

  return (
    <div data-slot="hole-strip" className={cn("flex flex-col gap-2.5", className)}>
      <div
        role="img"
        aria-label={`Hole by hole: ${counts.map(({ kind, count }) => `${count} ${scoreKindCountLabel(kind, count).toLowerCase()}`).join(", ")}`}
        className="flex gap-0.75"
      >
        {holes.map((hole) => (
          // A hole not yet scored is an empty cell, not a par.
          <div
            key={hole.hole}
            className={cn("h-3 min-w-0 flex-1 rounded-sm", hole.kind ? scoreFillClass(hole.kind) : "bg-muted")}
          />
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-label text-muted-foreground">
        <span>{holes[0].hole}</span>
        {front != null && <span>Out {front}</span>}
        {back != null && <span>In {back}</span>}
        <span>{holes[holes.length - 1].hole}</span>
      </div>
    </div>
  );
}

export type { HoleStripProps };
