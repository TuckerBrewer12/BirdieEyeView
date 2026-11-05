import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
import type { Round } from "@/domain";
import { formatCourseName } from "@/domain/course";

interface RoundScorecardProps {
  round: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Names the tee on the course line too, for a screen that doesn't show it anywhere else. */
  showTee?: boolean;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: ScorecardEdits;
  /** Holes whose score is in doubt, like one a scan couldn't read for sure. Their score cell is ringed. */
  toCheck?: readonly number[];
  /** Sits at the right of the header, like a "Scan another" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * A round as a scorecard: the course, then a ScorecardTable per nine, the closing one carrying
 * the round's totals. The tables are wider than a phone, so they scroll sideways under a header
 * that stays put, keeping the action in reach.
 */
function RoundScorecard({ round, teeBox, showTee = false, edits, toCheck, action, className }: RoundScorecardProps) {
  const nines = [
    { nine: round.frontNine, label: "OUT" },
    { nine: round.backNine, label: "IN" },
  ].filter(({ nine }) => nine.holes.length > 0);
  const subtitle = [round.course?.location, showTee && teeBox && `${teeBox} tees`].filter(Boolean).join(" · ");

  return (
    <div
      data-slot="round-scorecard"
      className={cn("overflow-hidden rounded-card border border-border bg-card shadow-sm", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <div className="text-base font-bold">{formatCourseName(round.course?.name)}</div>
          {subtitle && <div className="text-xs opacity-60">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-scorecard">
          {nines.map(({ nine, label }, i) => (
            <div key={label}>
              {i > 0 && (
                <div className="flex items-center gap-3 border-y border-border bg-muted/60 px-4 py-1.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold tracking-eyebrow text-muted-foreground uppercase">
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
                toCheck={toCheck}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { RoundScorecard };
