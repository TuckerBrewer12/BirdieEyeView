import type { ReactNode } from "react";
import { ScorecardCard } from "@/brand/components/ScorecardCard";
import { ScorecardTable, type ScorecardEdits } from "@/brand/components/ScorecardTable";
import type { Round } from "@/domain";
import { courseLabel } from "@/domain/course";

interface RoundScorecardProps {
  round: Round;
  teeBox?: string | null;
  edits?: ScorecardEdits;
  toCheck?: readonly number[];
  action?: ReactNode;
  className?: string;
}

function RoundScorecard({ round, teeBox, edits, toCheck, action, className }: RoundScorecardProps) {
  const where = round.course?.location ?? (round.course?.id == null ? "not linked to a course" : null);
  const courseLine = [courseLabel(round.course?.name), where].filter(Boolean).join(" · ");

  return (
    <ScorecardCard data-slot="round-scorecard" bar={courseLine} action={action} className={className}>
      {(nine) => <ScorecardTable round={round} teeBox={teeBox} edits={edits} toCheck={toCheck} nine={nine} />}
    </ScorecardCard>
  );
}

export { RoundScorecard };
