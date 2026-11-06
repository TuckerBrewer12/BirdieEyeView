import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
import { pluralize, type Round } from "@/domain";
import { formatCourseName } from "@/domain/course";

interface RoundScorecardProps {
  round: Round;
  /** The tee played, which names the yardage row and the course line. */
  teeBox?: string | null;
  /** The tee's course rating and slope, like "71.6 / 128", when the tee is rated. */
  teeRating?: string | null;
  /** Makes scores, putts and greens editable. The round shown should already carry the edits. */
  edits?: ScorecardEdits;
  /** Holes whose score is in doubt, like one a scan couldn't read for sure. Their score cell is ringed. */
  toCheck?: readonly number[];
  /** Sits at the right of the header, like a "Scan another" button. */
  action?: ReactNode;
  className?: string;
}

/**
 * A round as a scorecard: the course and the tee played, then a ScorecardTable of all eighteen holes
 * with the nines and the round totalled. The table is wider than a phone, so it scrolls sideways
 * under a header that stays put, keeping the action in reach.
 */
function RoundScorecard({ round, teeBox, teeRating, edits, toCheck, action, className }: RoundScorecardProps) {
  const teeLine = [
    teeBox && `${teeBox} tees`,
    round.yards != null && pluralize(round.yards, "yd"),
    teeRating,
  ].filter(Boolean);
  // A card with no tee read still says where it was played.
  const subtitle = (teeLine.length > 0 ? teeLine : [round.course?.location]).filter(Boolean).join(" · ");

  return (
    <div
      data-slot="round-scorecard"
      className={cn("overflow-hidden rounded-card border border-border bg-card shadow-sm", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 bg-primary px-5 py-4 leading-tight text-primary-foreground dark:bg-accent dark:text-foreground">
        <div>
          <div className="text-base font-bold">{formatCourseName(round.course?.name)}</div>
          {subtitle && <div className="mt-0.5 text-xs opacity-80">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-scorecard-round px-3 pt-2 pb-4">
          <ScorecardTable round={round} teeBox={teeBox} edits={edits} toCheck={toCheck} />
        </div>
      </div>
    </div>
  );
}

export { RoundScorecard };
