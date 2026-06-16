import { useLabViewModel } from "@/hooks/useLabViewModel";
import { MobileLabPage } from "@/components/the-lab/MobileLabPage";
import { LabDesktopLayout } from "@/components/the-lab/LabDesktopLayout";
import { ResponsivePage } from "@/components/layout/ResponsivePage";

interface TheLabPageProps {
  userId: string;
}

export function TheLabPage({ userId }: TheLabPageProps) {
  const vm = useLabViewModel(userId);

  return (
    <ResponsivePage
      mobile={
        <MobileLabPage
          analyticsData={vm.analytics}
          currentGoal={vm.currentGoal}
          setGoal={vm.setGoal}
          settingGoal={vm.settingGoal}
          mode={vm.radarMode}
          setMode={vm.setRadarMode}
          comparisonTarget={vm.targetHandicap}
          setComparisonTarget={vm.setTargetHandicap}
          activeProfile={vm.activeProfile}
          peakInsight={vm.peakInsight}
          peakScoreTypes={vm.peakScoreTypes}
          goalLabel={vm.goalLabel}
          benchmarkHeading={vm.benchmarkHeading}
        />
      }
      desktop={<LabDesktopLayout {...vm} />}
    />
  );
}
