import { useDashboardPageViewModel } from "./useDashboardPageViewModel";
import { MobileDashboard } from "./MobileDashboard";
import { DashboardDesktopLayout } from "./DashboardDesktopLayout";
import { HandicapBreakdownSheet } from "./HandicapBreakdownSheet";
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
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <MobileDashboard vm={vm} />
      </div>
      <div className="hidden md:block">
        <DashboardDesktopLayout vm={vm} />
      </div>
      <HandicapBreakdownSheet
        open={vm.handicapSheetOpen}
        onClose={vm.closeHandicapSheet}
        handicapIndex={vm.data.handicap_index}
        whs={vm.whs}
      />
    </>
  );
}
