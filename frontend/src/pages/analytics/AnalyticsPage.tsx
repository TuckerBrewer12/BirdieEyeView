import { Alert, AlertAction, AlertDescription, Button, LoadingState } from "@/brand";
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
    return <EmptyAnalytics vm={vm} />;
  }

  return <AnalyticsLayouts vm={vm} analytics={vm.analytics} />;
}

interface LayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

function EmptyAnalytics({ vm }: { vm: AnalyticsPageViewModel }) {
  const message = (
    <div className="flex h-48 items-center justify-center text-center">
      <p className="text-sm text-muted-foreground">{emptyMessage(vm.filtered)}</p>
    </div>
  );

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
