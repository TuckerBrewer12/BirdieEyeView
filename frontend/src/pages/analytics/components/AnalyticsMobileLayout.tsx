import { PageTitle, ToggleGroup, ToggleGroupItem } from "@/brand";
import type { Analytics, AnalyticsTab } from "../model";
import { ANALYTICS_TAB_OPTIONS, RANGE_VIEW_EMPTY, headlineFigures, tabNarrative } from "../present";
import type { AnalyticsPageViewModel } from "../useAnalyticsPageViewModel";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsKpis } from "./AnalyticsKpis";
import { BallStrikingCards, BestRoundCard, ProfileCards, PuttingCards, ScoringCards } from "./AnalyticsSections";
import { InsightNote } from "./InsightNote";
import { RangeViewCard } from "./RangeViewCard";

interface AnalyticsMobileLayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

export function AnalyticsMobileHeader({ vm }: { vm: AnalyticsPageViewModel }) {
  return (
    <div className="flex flex-col gap-3">
      <PageTitle>Analytics</PageTitle>
      <AnalyticsFilterBar
        filters={vm.filters}
        onChange={vm.setFilters}
        playedCourses={vm.playedCourses}
        hasHomeCourse={vm.hasHomeCourse}
      />
    </div>
  );
}

export function AnalyticsMobileLayout({ vm, analytics }: AnalyticsMobileLayoutProps) {
  const narrative = tabNarrative(analytics.insights, vm.tab);

  return (
    <div className="flex flex-col gap-5 pt-2 pb-6">
      <AnalyticsMobileHeader vm={vm} />
      <AnalyticsKpis kpis={headlineFigures(analytics)} />

      <section data-slot="analytics-sections" className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Section"
          variant="outline"
          size="sm"
          value={[vm.tab]}
          onValueChange={(values) => {
            const next = ANALYTICS_TAB_OPTIONS.find((option) => option.value === values[0]);
            if (next) vm.setTab(next.value);
          }}
          className="max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {ANALYTICS_TAB_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {narrative && <InsightNote narrative={narrative} />}
        <SectionCards tab={vm.tab} vm={vm} analytics={analytics} />
      </section>
    </div>
  );
}

function SectionCards({ tab, vm, analytics }: AnalyticsMobileLayoutProps & { tab: AnalyticsTab }) {
  switch (tab) {
    case "scoring":
      return (
        <>
          {vm.bestRound && <BestRoundCard round={vm.bestRound} />}
          <ScoringCards analytics={analytics} />
        </>
      );
    case "ball-striking":
      return <BallStrikingCards analytics={analytics} />;
    case "putting":
      return <PuttingCards analytics={analytics} />;
    case "profile":
      return <ProfileCards analytics={analytics} />;
    case "range":
      return analytics.yardageBuckets.length > 0 ? (
        <RangeViewCard buckets={analytics.yardageBuckets} par={vm.rangePar} onParChange={vm.setRangePar} />
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">{RANGE_VIEW_EMPTY}</p>
      );
  }
}
