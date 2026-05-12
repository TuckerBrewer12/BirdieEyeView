import { useCareerViewModel } from "@/hooks/useCareerViewModel";
import { MobileCareerPage } from "@/components/analytics/MobileCareerPage";
import { CareerDesktopLayout } from "@/components/analytics/CareerDesktopLayout";
import { ResponsivePage } from "@/components/layout/ResponsivePage";

export function CareerPage({ userId }: { userId: string }) {
  const vm = useCareerViewModel(userId);

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading career...</div>
      </div>
    );
  }

  if (!vm.data) {
    return <div className="text-gray-500">Unable to load achievements.</div>;
  }

  return (
    <ResponsivePage
      mobile={<MobileCareerPage {...vm} data={vm.data} />}
      desktop={<CareerDesktopLayout {...vm} />}
    />
  );
}
