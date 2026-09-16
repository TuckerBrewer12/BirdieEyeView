import { useDashboardPageViewModel } from "./useDashboardPageViewModel";
import { MobileDashboard } from "./MobileDashboard";
import { DashboardDesktopLayout } from "./DashboardDesktopLayout";
import { ResponsivePage } from "@/components/layout/ResponsivePage";
import {
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  LoadingState,
} from "@/brand";

interface DashboardPageProps {
  userId: string;
}

export function DashboardPage({ userId }: DashboardPageProps) {
  const vm = useDashboardPageViewModel(userId);

  if (vm.loading) {
    return <LoadingState>Loading dashboard...</LoadingState>;
  }

  if (!vm.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {vm.error?.message ?? "Dashboard data failed to load."}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={() => void vm.refetch()}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <ResponsivePage
      mobile={
        <MobileDashboard
          data={vm.data!}
          trends={vm.trends}
          user={vm.user ?? null}
          goalReport={vm.goalReport ?? null}
          dualData={vm.dualData}
          last20ScoringAvg={vm.last20ScoringAvg}
          l5ScoringAvg={vm.l5ScoringAvg}
          handicapDelta={vm.handicapDelta}
          l20ScoreMix={vm.l20ScoreMix}
          girPct={vm.girPct}
          scramblingPct={vm.scramblingPct}
          upAndDownPct={vm.upAndDownPct}
          putts={vm.putts}
          scoreColors={vm.scoreColors}
          scoreLineColor={vm.scoreLineColor}
          handicapLineColor={vm.handicapLineColor}
        />
      }
      desktop={<DashboardDesktopLayout {...vm} />}
    />
  );
}
