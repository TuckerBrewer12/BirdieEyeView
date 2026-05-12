import { useDashboardViewModel } from "@/hooks/useDashboardViewModel";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { DashboardDesktopLayout } from "@/components/dashboard/DashboardDesktopLayout";
import { ResponsivePage } from "@/components/layout/ResponsivePage";

interface DashboardPageProps {
  userId: string;
}

export function DashboardPage({ userId }: DashboardPageProps) {
  const vm = useDashboardViewModel(userId);

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!vm.data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-sm text-red-500 text-center max-w-md px-4">
          {(vm.error as Error | null)?.message ?? "Dashboard data failed to load."}
        </div>
        <button
          type="button"
          onClick={() => void vm.refetch()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ResponsivePage
      mobile={<MobileDashboard {...vm} data={vm.data!} user={vm.user ?? null} goalReport={vm.goalReport ?? null} />}
      desktop={<DashboardDesktopLayout {...vm} />}
    />
  );
}
