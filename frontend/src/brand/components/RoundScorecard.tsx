import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { Card } from "@/brand/components/Card";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
import { useFromBreakpoint } from "@/brand/useFromBreakpoint";
import type { Round } from "@/domain";
import { courseLabel } from "@/domain/course";

interface RoundScorecardProps {
  round: Round;
  /** The tee played, which names the yardage row. */
  teeBox?: string | null;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: ScorecardEdits;
  /** Holes whose score is in doubt, like one a scan couldn't read for sure. Their score cell is ringed. */
  toCheck?: readonly number[];
  /** Sits at the right of the course line, like a "Scan another" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * A round as a scorecard: the course line, then a ScorecardTable of all eighteen holes with the nines
 * and the round totalled. A phone has no room for eighteen across, so it stacks the front nine over the
 * back, each closed by its own total.
 */
function RoundScorecard({ round, teeBox, edits, toCheck, action, className }: RoundScorecardProps) {
  // Which tables to draw, not how they look: the phone's two nines are a different table.
  const wide = useFromBreakpoint("md");
  // Where the course is, read off the card or the saved course; a saved round with no course says so.
  const where = round.course?.location ?? (round.course?.id == null ? "not linked to a course" : null);
  const courseLine = [courseLabel(round.course?.name), where].filter(Boolean).join(" · ");
  const table = { round, teeBox, edits, toCheck };

  return (
    <Card data-slot="round-scorecard" className={cn("gap-0 py-0", className)}>
      <div className="flex min-h-11 items-center justify-between gap-4 bg-primary px-4 py-2.5 text-body-sm font-semibold text-primary-foreground md:px-5 dark:bg-accent dark:text-foreground">
        <span className="min-w-0 truncate">{courseLine}</span>
        {action}
      </div>
      {wide ? (
        <div className="overflow-x-auto">
          <div className="min-w-scorecard-round px-3 pt-1 pb-2.5">
            <ScorecardTable {...table} />
          </div>
        </div>
      ) : (
        <div className="pb-1">
          <ScorecardTable {...table} nine="front" />
          <div aria-hidden className="h-1.5 bg-background" />
          <ScorecardTable {...table} nine="back" />
        </div>
      )}
    </Card>
  );
}

export { RoundScorecard };
