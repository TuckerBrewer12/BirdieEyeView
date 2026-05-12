import { useAnalyticsViewModel } from "@/hooks/useAnalyticsViewModel";
import { MobileAnalyticsPage } from "@/components/analytics/MobileAnalyticsPage";
import { AnalyticsDesktopLayout } from "@/components/analytics/AnalyticsDesktopLayout";
import { AnalyticsCommandCenter } from "@/components/analytics/AnalyticsCommandCenter";
import { ResponsivePage } from "@/components/layout/ResponsivePage";

export function AnalyticsPage({ userId }: { userId: string }) {
  const vm = useAnalyticsViewModel(userId);

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (vm.isEmpty) {
    const emptyMsg = vm.isFiltered
      ? "No rounds found for the selected filters."
      : "Play some rounds to see your analytics.";

    return (
      <ResponsivePage
        mobile={
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-gray-400 text-sm">{emptyMsg}</p>
          </div>
        }
        desktop={
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">Analytics</h1>
            <AnalyticsCommandCenter
              filters={vm.filters}
              onChange={vm.setFilters}
              playedCourses={vm.playedCourses}
              hasHomeCourse={vm.hasHomeCourse}
              kpis={null}
            />
            <div className="flex flex-col items-center justify-center h-48 text-center mt-4">
              <p className="text-gray-400 text-sm">{emptyMsg}</p>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <ResponsivePage
      mobile={
        <MobileAnalyticsPage
          data={vm.data!}
          filters={vm.filters}
          setFilters={vm.setFilters}
          playedCourses={vm.playedCourses}
          hasHomeCourse={vm.hasHomeCourse}
          scoreTrendWithAvg={vm.scoreTrendWithAvg}
          donutData={vm.donutData}
          girData={vm.girData}
          threePuttsData={vm.threePuttsData}
          insights={vm.insights}
          bestRound={vm.bestRound}
          avgPutts={vm.avgPutts}
          trendPrimary={vm.trendPrimary}
          trendSecondary={vm.trendSecondary}
          trendTertiary={vm.trendTertiary}
          successColor={vm.successColor}
          dangerColor={vm.dangerColor}
          neutralColor={vm.neutralColor}
          gridColor={vm.gridColor}
          mutedFill={vm.mutedFill}
          scoreColors={vm.scoreColors}
        />
      }
      desktop={<AnalyticsDesktopLayout {...vm} />}
    />
  );
}
