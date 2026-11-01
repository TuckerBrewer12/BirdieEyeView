// The phone layout still renders the legacy Lab components, fed from the new view model.
// The next Lab PR moves it onto the kit and deletes this file with `components/the-lab`.
import { MobileLabPage } from "@/components/the-lab/MobileLabPage";
import type { LabPageViewModel } from "./useLabPageViewModel";
import { benchmarkHeading, goalLabel } from "./present";

export function LegacyMobileLab({ vm }: { vm: LabPageViewModel }) {
  const target = vm.goal?.target ?? null;
  return (
    <MobileLabPage
      analyticsData={vm.analytics ?? undefined}
      currentGoal={target}
      setGoal={vm.setGoal}
      settingGoal={vm.savingGoal}
      mode={vm.radarMode}
      setMode={vm.setRadarMode}
      comparisonTarget={vm.comparison}
      setComparisonTarget={vm.setComparison}
      activeProfile={vm.benchmark}
      peakInsight={
        vm.peak && {
          top: vm.peak.rounds.map((round, i) => ({
            total_score: round.score,
            round_index: i,
            course_name: round.courseName,
          })),
          bestAvg: vm.peak.average,
          overallAvg: vm.peak.overallAverage,
          gapToGoal: vm.peak.gapToGoal,
        }
      }
      peakScoreTypes={vm.peakVsAverage && { peak: vm.peakVsAverage.peak, all: vm.peakVsAverage.average }}
      goalLabel={goalLabel(target)}
      benchmarkHeading={benchmarkHeading(vm.radarMode, vm.comparison, vm.selectedFriend, vm.peak)}
    />
  );
}
