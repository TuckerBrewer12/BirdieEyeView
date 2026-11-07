import { useDashboardPageViewModel } from "./useDashboardPageViewModel";
import { DashboardMobileLayout } from "./components/DashboardMobileLayout";
import { DashboardDesktopLayout } from "./components/DashboardDesktopLayout";
import { HandicapBreakdownSheet } from "./components/HandicapBreakdownSheet";
import { LoadError, LoadingState } from "@/brand";

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
      <LoadError
        message={vm.error?.message ?? "Dashboard data failed to load."}
        onRetry={() => void vm.refetch()}
      />
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
        whs={vm.whs}
      />
    </>
  );
}
