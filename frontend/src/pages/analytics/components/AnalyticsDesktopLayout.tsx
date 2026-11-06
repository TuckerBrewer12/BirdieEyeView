import type { ReactNode } from "react";
import { PageTitle, SectionLabel } from "@/brand";
import type { Analytics } from "../model";
import { headlineFigures } from "../present";
import type { AnalyticsPageViewModel } from "../useAnalyticsPageViewModel";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsKpis } from "./AnalyticsKpis";
import { BallStrikingCards, BestRoundCard, ProfileCards, PuttingCards, ScoringCards } from "./AnalyticsSections";
import { RangeViewCard } from "./RangeViewCard";

interface AnalyticsDesktopLayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

/** The title and the filters, pinned while the figures scroll under them. */
export function AnalyticsDesktopHeader({ vm }: { vm: AnalyticsPageViewModel }) {
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-6 flex flex-col gap-3 border-b border-border bg-background/glass px-6 py-3 backdrop-blur-xl">
      <PageTitle size="lg">Analytics</PageTitle>
      <AnalyticsFilterBar
        filters={vm.filters}
        onChange={vm.setFilters}
        playedCourses={vm.playedCourses}
        hasHomeCourse={vm.hasHomeCourse}
      />
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{children}</div>
    </section>
  );
}

/** The analytics page from md up: the headline figures, the best round, then each part of the game. */
export function AnalyticsDesktopLayout({ vm, analytics }: AnalyticsDesktopLayoutProps) {
  return (
    <div className="flex flex-col gap-10 pb-12">
      <div className="flex flex-col gap-5">
        <AnalyticsKpis kpis={headlineFigures(analytics)} />
        {vm.bestRound && <BestRoundCard round={vm.bestRound} />}
      </div>

      <Section label="Scoring">
        <ScoringCards analytics={analytics} />
      </Section>

      <Section label="Ball Striking">
        <BallStrikingCards analytics={analytics} />
      </Section>

      <Section label="Putting">
        <PuttingCards analytics={analytics} />
      </Section>

      <Section label="Performance Profile">
        <ProfileCards analytics={analytics} />
        {analytics.yardageBuckets.length > 0 && (
          <RangeViewCard
            className="lg:col-span-2"
            buckets={analytics.yardageBuckets}
            par={vm.rangePar}
            onParChange={vm.setRangePar}
          />
        )}
      </Section>
    </div>
  );
}
