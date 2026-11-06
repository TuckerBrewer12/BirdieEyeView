import { PageTitle, SectionLabel } from "@/brand";
import type { LabPageViewModel } from "../useLabPageViewModel";
import { benchmarkName, goalLabel } from "../present";
import { AttemptsCard } from "./AttemptsCard";
import { GoalPicker } from "./GoalPicker";
import { GoalStandingCard } from "./GoalStandingCard";
import { ParTypeCard } from "./ParTypeCard";
import { PeakGameCard } from "./PeakGameCard";
import { PerformanceShapeCard } from "./PerformanceShapeCard";
import { PuttingCard } from "./PuttingCard";
import { SaverCard } from "./SaverCard";

const MIN_ATTEMPTS = 3;

export function LabDesktopLayout({ vm }: { vm: LabPageViewModel }) {
  const target = vm.goal?.target ?? null;
  const label = goalLabel(target);
  const savers = vm.goal?.savers ?? [];

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageTitle>The Lab</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">Your blueprint to lower scores.</p>
        </div>
        <div className="flex flex-col items-start gap-1 lg:items-end">
          <GoalPicker value={target} onChange={vm.setGoal} disabled={vm.savingGoal} className="flex-wrap" />
        </div>
      </div>

      <section>
        <SectionLabel>Your Goal</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GoalStandingCard goal={vm.goal} />
          {target != null && vm.attempts.length >= MIN_ATTEMPTS && (
            <AttemptsCard
              attempts={vm.attempts}
              target={target}
              timesMet={vm.roundsMeetingGoal}
              className="lg:col-span-2"
            />
          )}
        </div>
      </section>

      {savers.length > 0 && (
        <section>
          <SectionLabel>Where to Find Strokes</SectionLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savers.map((saver) => (
              <SaverCard key={saver.kind} saver={saver} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Benchmark Analysis</SectionLabel>
        <PerformanceShapeCard
          mode={vm.radarMode}
          onModeChange={vm.setRadarMode}
          peak={vm.peak}
          goalLabel={label}
          scoringAverage={vm.scoringAverage}
          lowestScore={vm.lowestScore}
          recentTrend={vm.recentTrend}
          comparison={vm.comparison}
          onComparisonChange={vm.setComparison}
          friends={vm.friends}
          selectedFriend={vm.selectedFriend}
          onSelectFriend={vm.selectFriend}
          friendComparison={vm.friendComparison}
          radar={vm.radar}
          compared={vm.benchmark != null}
          missingAxes={vm.missingAxes}
        />
      </section>

      <section>
        <SectionLabel>Performance Breakdown</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ParTypeCard
            rows={vm.parTypes}
            benchmarkName={vm.benchmark ? benchmarkName(vm.radarMode, vm.comparison, vm.selectedFriend) : null}
          />
          {vm.putting && <PuttingCard putting={vm.putting} />}
        </div>
      </section>

      {vm.peak && (
        <section>
          <SectionLabel>Peak Game</SectionLabel>
          <PeakGameCard peak={vm.peak} impacts={vm.peakImpacts} goalLabel={label} />
        </section>
      )}
    </div>
  );
}
