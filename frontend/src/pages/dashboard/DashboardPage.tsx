import { useDashboardPageViewModel } from "./useDashboardPageViewModel";
import { DashboardMobileLayout } from "./components/DashboardMobileLayout";
import { DashboardDesktopLayout } from "./components/DashboardDesktopLayout";
import { HandicapBreakdownSheet } from "./components/HandicapBreakdownSheet";
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
        <DashboardMobileLayout vm={vm} />
      </div>
      <div className="hidden md:block">
        <DashboardDesktopLayout vm={vm} />
      </div>
      <HandicapBreakdownSheet
        open={vm.handicapSheetOpen}
        onClose={vm.closeHandicapSheet}
        handicapIndex={vm.data.handicap_index}
        handicapChange={vm.figures?.handicapChange ?? null}
        handicapVerdict={vm.figures?.handicapVerdict ?? null}
        whs={vm.whs}
      />
    </>
  );
}
