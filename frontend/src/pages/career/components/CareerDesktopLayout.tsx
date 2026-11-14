import { PageTitle } from "@/brand";
import type { Career, CareerWindowFigures } from "../model";
import { MILESTONE_GROUP_TITLE, NO_NEW_RECORDS, PAGE_SUBTITLE, newRecordsNote, noRoundsInWindow, totalsTitle } from "../present";
import type { CareerPageViewModel } from "../useCareerPageViewModel";
import { CareerWindowPicker } from "./CareerWindowPicker";
import { HandicapTrendCard } from "./HandicapTrendCard";
import { MilestonesCard } from "./MilestonesCard";
import { PlayerProfileCard } from "./PlayerProfileCard";
import { RecordsCard } from "./RecordsCard";
import { ScoreMixCard } from "./ScoreMixCard";
import { TotalsCard } from "./TotalsCard";

export interface CareerLayoutProps {
  vm: CareerPageViewModel;
  career: Career;
  figures: CareerWindowFigures;
  onOpenRound: (roundId: string) => void;
}

/** Career from md up: the handicap and the golfer's shape, then the window's records and milestones. */
export function CareerDesktopLayout({ vm, career, figures, onOpenRound }: CareerLayoutProps) {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle size="lg">Career</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
        </div>
        <CareerWindowPicker value={vm.timeWindow} onChange={vm.setTimeWindow} windowDays={career.windowDays} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HandicapTrendCard
          className="lg:col-span-2"
          trend={figures.handicapTrend}
          handicapIndex={career.handicapIndex}
          empty={noRoundsInWindow(career.windowDays)}
        />
        <PlayerProfileCard profile={career.profile} />
        <div className="flex flex-col gap-5">
          <ScoreMixCard mix={career.scoreMix} holesPlayed={career.holesPlayed} />
          <TotalsCard className="flex-1" title={totalsTitle(vm.timeWindow)} totals={figures.totals} />
        </div>
        <RecordsCard records={figures.records} onOpenRound={onOpenRound} />
        <MilestonesCard
          title={MILESTONE_GROUP_TITLE.scoring}
          milestones={figures.scoring}
          note={figures.newRecords != null ? newRecordsNote(figures.newRecords, career.windowDays) : null}
          empty={NO_NEW_RECORDS}
          onOpenRound={onOpenRound}
        />
        <MilestonesCard title={MILESTONE_GROUP_TITLE.putting} milestones={figures.putting} onOpenRound={onOpenRound} />
        <MilestonesCard title={MILESTONE_GROUP_TITLE.gir} milestones={figures.gir} onOpenRound={onOpenRound} />
      </div>
    </div>
  );
}
