import { EmptyState, LoadError, LoadingState } from "@/brand";
import { AnalyticsDesktopHeader, AnalyticsDesktopLayout } from "./components/AnalyticsDesktopLayout";
import { AnalyticsMobileHeader, AnalyticsMobileLayout } from "./components/AnalyticsMobileLayout";
import type { Analytics } from "./model";
import { emptyMessage } from "./present";
import { useAnalyticsPageViewModel, type AnalyticsPageViewModel } from "./useAnalyticsPageViewModel";

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
      <LoadError message={vm.loadError ?? "Could not load your analytics."} onRetry={vm.retry} />
    );
  }

  if (vm.showEmpty) {
    return <EmptyAnalytics vm={vm} />;
  }

  return <AnalyticsLayouts vm={vm} analytics={vm.analytics} />;
}

interface LayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

/** No round matches the filters. The filters stay up so the golfer can widen them again. */
function EmptyAnalytics({ vm }: { vm: AnalyticsPageViewModel }) {
  const message = <EmptyState>{emptyMessage(vm.filtered)}</EmptyState>;

  return (
    <>
      <div className="flex flex-col gap-5 pt-2 md:hidden">
        {vm.filtered && <AnalyticsMobileHeader vm={vm} />}
        {message}
      </div>
      <div className="hidden md:block">
        <AnalyticsDesktopHeader vm={vm} />
        {message}
      </div>
    </>
  );
}

function AnalyticsLayouts({ vm, analytics }: LayoutProps) {
  return (
    <>
      {/* CSS picks the layout, so the page renders the same on the server and the first paint. */}
      <div className="md:hidden">
        <AnalyticsMobileLayout vm={vm} analytics={analytics} />
      </div>
      <div className="hidden md:block">
        <AnalyticsDesktopHeader vm={vm} />
        <AnalyticsDesktopLayout vm={vm} analytics={analytics} />
      </div>
    </>
  );
}
