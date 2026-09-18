import { useDashboardPageViewModel } from "./useDashboardPageViewModel";
import { MobileDashboard } from "./MobileDashboard";
import { DashboardDesktopLayout } from "./DashboardDesktopLayout";
import { HandicapBreakdownSheet } from "./HandicapBreakdownSheet";
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
    <>
      <ResponsivePage
        mobile={<MobileDashboard vm={vm} />}
        desktop={<DashboardDesktopLayout vm={vm} />}
      />
      <HandicapBreakdownSheet
        open={vm.handicapSheetOpen}
        onClose={vm.closeHandicapSheet}
        handicapIndex={vm.data.handicap_index}
        whs={vm.whs}
      />
    </>
  );
}
