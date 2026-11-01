import { Alert, AlertAction, AlertDescription, Button, LoadingState, PageTitle, colors } from "@/brand";
// The legacy layouts stay until Analytics PR B (charts) and PR C (phone layout) replace them.
import { AnalyticsCommandCenter } from "@/components/analytics/AnalyticsCommandCenter";
import { AnalyticsDesktopLayout } from "@/components/analytics/AnalyticsDesktopLayout";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { MobileAnalyticsPage } from "@/components/analytics/MobileAnalyticsPage";
import { ANALYTICS_TABS, type Analytics } from "./model";
import {
  TAB_LABELS,
  averagePuttsLabel,
  emptyMessage,
  girVsNonGirBars,
  leadNarrative,
} from "./present";
import { useAnalyticsPageViewModel, type AnalyticsPageViewModel } from "./useAnalyticsPageViewModel";

const TABS = ANALYTICS_TABS.map((id) => ({ id, label: TAB_LABELS[id] }));

interface AnalyticsPageProps {
  userId: string;
}

export function AnalyticsPage({ userId }: AnalyticsPageProps) {
  const vm = useAnalyticsPageViewModel(userId);

  if (vm.loading) {
    return <LoadingState>Loading analytics...</LoadingState>;
  }

  if (!vm.analytics) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{vm.loadError ?? "Could not load your analytics."}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={vm.retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  if (vm.showEmpty) {
    return <EmptyAnalytics vm={vm} analytics={vm.analytics} />;
  }

  return <AnalyticsLayouts vm={vm} analytics={vm.analytics} />;
}

interface LayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

/** No round matches the filters. The filters stay up so the golfer can widen them again. */
function EmptyAnalytics({ vm, analytics }: LayoutProps) {
  const message = <p className="text-sm text-muted-foreground">{emptyMessage(vm.filtered)}</p>;
  const filters = {
    filters: vm.filters,
    playedCourses: vm.playedCourses,
    hasHomeCourse: vm.hasHomeCourse,
  };

  return (
    <>
      <div className="md:hidden">
        {vm.filtered && (
          <AnalyticsHeader
            {...filters}
            setFilters={vm.setFilters}
            totalRounds={analytics.roundCount}
            handicapIndex={analytics.kpis.handicap_index ?? null}
            scoringAvg={null}
            bestScore={null}
            avgPutts={null}
            girPct={null}
            accentHcap={colors.primary}
            accentAvg={colors.score.bogey.base}
            accentBest={colors.score.double.base}
            accentPutts={colors.score.triple.base}
            accentGir={colors.score.birdie.base}
          />
        )}
        <div className="flex h-48 items-center justify-center text-center">{message}</div>
      </div>
      <div className="hidden md:block">
        <PageTitle size="lg" className="mb-3">Analytics</PageTitle>
        <AnalyticsCommandCenter {...filters} onChange={vm.setFilters} kpis={null} />
        <div className="mt-4 flex h-48 items-center justify-center text-center">{message}</div>
      </div>
    </>
  );
}

function AnalyticsLayouts({ vm, analytics }: LayoutProps) {
  const shared = {
    data: analytics.sections,
    filters: vm.filters,
    setFilters: vm.setFilters,
    playedCourses: vm.playedCourses,
    hasHomeCourse: vm.hasHomeCourse,
    scoreTrend: analytics.scoreTrend,
    scoreMix: analytics.scoreMix,
    girTrend: analytics.girTrend,
    girRoundsLeftOut: analytics.girRoundsLeftOut,
    puttsTrend: analytics.puttsTrend,
    threePuttTrend: analytics.threePuttTrend,
    bestScore: analytics.bestScore,
    averagePutts: averagePuttsLabel(analytics.averagePutts),
    girVsNonGir: girVsNonGirBars(analytics.sections.gir_vs_non_gir),
  };

  return (
    <>
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <MobileAnalyticsPage
          {...shared}
          tabs={TABS}
          tab={vm.tab}
          onTabChange={vm.setTab}
          scrambling={analytics.scrambling}
          upAndDown={analytics.upAndDown}
          narratives={{
            scoring: leadNarrative(analytics.insights, "scoring"),
            ballStriking: leadNarrative(analytics.insights, "gir"),
            putting: leadNarrative(analytics.insights, "putting"),
          }}
        />
      </div>
      <div className="hidden md:block">
        <AnalyticsDesktopLayout {...shared} shortGameTrend={analytics.shortGameTrend} />
      </div>
    </>
  );
}
