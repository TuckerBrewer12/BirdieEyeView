import { useCareerViewModel } from "@/hooks/useCareerViewModel";
import { MobileCareerPage } from "@/components/analytics/MobileCareerPage";
import { CareerDesktopLayout } from "@/components/analytics/CareerDesktopLayout";

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
    <>
      <div className="md:hidden">
        <MobileCareerPage {...vm} data={vm.data} />
      </div>
      <div className="hidden md:block">
        <CareerDesktopLayout {...vm} />
      </div>
    </>
  );
}
