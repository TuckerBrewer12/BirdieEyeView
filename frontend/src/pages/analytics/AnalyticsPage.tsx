import { useSearchParams } from "react-router-dom";
import { Alert, AlertAction, AlertDescription, Button, EmptyNote, LoadingState, TabBar } from "@/brand";
import { AnalyticsHeader } from "./components/AnalyticsHeader";
import { ApproachSection } from "./components/ApproachSection";
import { BallStrikingSection } from "./components/BallStrikingSection";
import { HeadlineStrip } from "./components/HeadlineStrip";
import { ProfileSection } from "./components/ProfileSection";
import { PuttingSection } from "./components/PuttingSection";
import { ScoringSection } from "./components/ScoringSection";
import { DEFAULT_TAB, tabFrom, type Analytics } from "./model";
import { ANALYTICS_TAB_OPTIONS, emptyMessage } from "./present";
import { useAnalyticsPageViewModel, type AnalyticsPageViewModel } from "./useAnalyticsPageViewModel";

interface AnalyticsPageProps {
  userId: string;
}

export function AnalyticsPage({ userId }: AnalyticsPageProps) {
  const [params] = useSearchParams();
  const vm = useAnalyticsPageViewModel(userId, {
    initialTab: tabFrom(params.get("tab")) ?? DEFAULT_TAB,
    initialFriendId: params.get("friend"),
  });

  if (vm.loading) {
    return <LoadingState>Loading analytics...</LoadingState>;
  }

  if (!vm.analytics) {
    return (
      <Alert tone="danger">
        <AlertDescription>{vm.loadError ?? "Could not load your analytics."}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="xs" onClick={vm.retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return (
    <div data-slot="analytics-page" className="flex flex-col gap-3.5 pb-6 md:gap-4">
      <AnalyticsHeader vm={vm} roundCount={vm.analytics.roundCount} />
      {vm.showEmpty ? (
        <EmptyNote className="flex h-48 items-center justify-center py-0">{emptyMessage(vm.filtered)}</EmptyNote>
      ) : (
        <AnalyticsBody vm={vm} analytics={vm.analytics} />
      )}
    </div>
  );
}

function AnalyticsBody({ vm, analytics }: { vm: AnalyticsPageViewModel; analytics: Analytics }) {
  return (
    <>
      <HeadlineStrip figures={analytics.headline} className={vm.tab === "scoring" ? undefined : "max-md:hidden"} />
      <TabBar
        aria-label="Analytics sections"
        tabs={ANALYTICS_TAB_OPTIONS}
        value={vm.tab}
        onValueChange={(key) => {
          const next = ANALYTICS_TAB_OPTIONS.find((option) => option.key === key);
          if (next) vm.setTab(next.key);
        }}
        className="mt-1"
      />
      <div role="tabpanel" aria-label={ANALYTICS_TAB_OPTIONS.find((option) => option.key === vm.tab)?.label}>
        {vm.tab === "profile" && <ProfileSection profile={vm.profile} />}
        {vm.tab === "scoring" && (
          <ScoringSection
            analytics={analytics}
            reading={vm.scoreReading}
            onReadingChange={vm.setScoreReading}
            lines={vm.trendLines}
            onLinesChange={vm.setTrendLines}
            shown={vm.trendShown.score}
            onShownChange={(shown) => vm.setTrendShown("score", shown)}
          />
        )}
        {vm.tab === "ball-striking" && (
          <BallStrikingSection
            analytics={analytics}
            shown={vm.trendShown.greens}
            onShownChange={(shown) => vm.setTrendShown("greens", shown)}
          />
        )}
        {vm.tab === "putting" && (
          <PuttingSection
            analytics={analytics}
            shown={vm.trendShown.putts}
            onShownChange={(shown) => vm.setTrendShown("putts", shown)}
          />
        )}
        {vm.tab === "approach" && (
          <ApproachSection analytics={analytics} par={vm.approachPar} onParChange={vm.setApproachPar} />
        )}
      </div>
    </>
  );
}
