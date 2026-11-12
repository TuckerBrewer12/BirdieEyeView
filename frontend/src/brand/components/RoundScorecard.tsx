import type { ReactNode } from "react";
import { ScorecardCard } from "@/brand/components/ScorecardCard";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
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
  // Where the course is, read off the card or the saved course; a saved round with no course says so.
  const where = round.course?.location ?? (round.course?.id == null ? "not linked to a course" : null);
  const courseLine = [courseLabel(round.course?.name), where].filter(Boolean).join(" · ");

  return (
    <ScorecardCard data-slot="round-scorecard" bar={courseLine} action={action} className={className}>
      {(nine) => <ScorecardTable round={round} teeBox={teeBox} edits={edits} toCheck={toCheck} nine={nine} />}
    </ScorecardCard>
  );
}

export { RoundScorecard };
