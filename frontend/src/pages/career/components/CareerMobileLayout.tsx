import { PageTitle, ToggleGroup, ToggleGroupItem } from "@/brand";
import { MILESTONE_GROUPS } from "../model";
import {
  MILESTONE_GROUP_LABEL,
  NO_NEW_RECORDS,
  PAGE_SUBTITLE,
  newRecordsNote,
  totalsTitle,
} from "../present";
import type { CareerLayoutProps } from "./CareerDesktopLayout";
import { CareerWindowPicker } from "./CareerWindowPicker";
import { HandicapTrendCard } from "./HandicapTrendCard";
import { MilestonesCard } from "./MilestonesCard";
import { PlayerProfileCard } from "./PlayerProfileCard";
import { RecordsCard } from "./RecordsCard";
import { ScoreMixCard } from "./ScoreMixCard";
import { TotalsCard } from "./TotalsCard";

/** Career below md: the desktop's cards in one column, with the milestone lists behind tabs. */
export function CareerMobileLayout({ vm, career, figures, onOpenRound }: CareerLayoutProps) {
  const group = vm.milestoneGroup;
  const scoring = group === "scoring";

  return (
    <div className="flex flex-col gap-4 pt-2 pb-6">
      <div className="flex flex-col gap-3">
        <div>
          <PageTitle>Career</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
        <CareerWindowPicker value={vm.timeWindow} onChange={vm.setTimeWindow} windowDays={career.windowDays} />
      </div>

      <HandicapTrendCard
        trend={career.handicapTrend}
        handicapIndex={career.handicapIndex}
        roundCount={career.roundCount}
        compact
      />
      <TotalsCard title={totalsTitle(vm.timeWindow)} totals={figures.totals} />
      <ScoreMixCard mix={career.scoreMix} holesPlayed={career.holesPlayed} />
      <PlayerProfileCard profile={career.profile} compact />
      <RecordsCard records={figures.records} onOpenRound={onOpenRound} />
      <MilestonesCard
        title="Milestones"
        milestones={figures[group]}
        note={scoring && figures.newRecords != null ? newRecordsNote(figures.newRecords, career.windowDays) : null}
        empty={scoring ? NO_NEW_RECORDS : undefined}
        onOpenRound={onOpenRound}
        controls={
          <ToggleGroup
            data-slot="milestone-tabs"
            aria-label="Milestones"
            size="sm"
            value={[group]}
            onValueChange={(values) => {
              // Tapping the open tab would empty the group; one list is always open.
              const next = MILESTONE_GROUPS.find((option) => option === values[0]);
              if (next) vm.setMilestoneGroup(next);
            }}
          >
            {MILESTONE_GROUPS.map((option) => (
              <ToggleGroupItem key={option} value={option}>
                {MILESTONE_GROUP_LABEL[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
    </div>
  );
}
