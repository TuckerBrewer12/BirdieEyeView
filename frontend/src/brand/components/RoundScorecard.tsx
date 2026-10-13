import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
import type { Round } from "@/domain";
import { formatCourseName } from "@/lib/courseName";

interface RoundScorecardProps {
  round: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: ScorecardEdits;
  /** Sits at the right of the header, like a "Scan another" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * A round as a scorecard: the course, then a ScorecardTable per nine, the closing one carrying
 * the round's totals. Wider than a phone, so it scrolls sideways.
 */
function RoundScorecard({ round, teeBox, edits, action, className }: RoundScorecardProps) {
  const nines = [
    { nine: round.frontNine, label: "OUT" },
    { nine: round.backNine, label: "IN" },
  ].filter(({ nine }) => nine.holes.length > 0);

  return (
    <div
      data-slot="round-scorecard"
      className={cn("overflow-x-auto rounded-card border border-border bg-card shadow-sm", className)}
    >
      <div className="min-w-scorecard">
        <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
          <div>
            <div className="text-base font-bold">{formatCourseName(round.course?.name)}</div>
            {round.course?.location && <div className="text-xs opacity-60">{round.course.location}</div>}
          </div>
          {action}
        </div>
        {nines.map(({ nine, label }, i) => (
          <div key={label}>
            {i > 0 && (
              <div className="flex items-center gap-3 border-y border-border bg-muted/60 px-4 py-1.5">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Back Nine
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <ScorecardTable
              nine={nine}
              label={label}
              round={i === nines.length - 1 ? round : undefined}
              teeBox={teeBox}
              edits={edits}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export { RoundScorecard };
