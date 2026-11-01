import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageTitle,
  RoundPreview,
  ScoreMixBar,
  SectionLabel,
  ToParBars,
} from "@/brand";
import type { Analytics } from "../model";
import {
  averageReference,
  girPoints,
  handicapBars,
  headlineFigures,
  netScorePoints,
  parBars,
  percentLabel,
  puttsPoints,
  scoreTrendPoints,
  shortGamePoints,
  threePuttPoints,
} from "../present";
import type { AnalyticsPageViewModel } from "../useAnalyticsPageViewModel";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsKpis } from "./AnalyticsKpis";
import { GirSplitCard } from "./GirSplitCard";
import { RangeViewCard } from "./RangeViewCard";
import { TrendCard } from "./TrendCard";

interface AnalyticsDesktopLayoutProps {
  vm: AnalyticsPageViewModel;
  analytics: Analytics;
}

/** The title and the filters, pinned while the figures scroll under them. */
export function AnalyticsDesktopHeader({ vm }: { vm: AnalyticsPageViewModel }) {
  return (
    <div className="sticky top-0 z-30 -mx-6 mb-6 flex flex-col gap-3 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-xl">
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
  const navigate = useNavigate();
  const { sections } = analytics;
  const hasShortGame = sections.scrambling_trend.length > 0 || sections.up_and_down_trend.length > 0;
  const hasThreePutts = analytics.threePuttTrend.length > 0;
  const bestRound = vm.bestRound;

  return (
    <div className="flex flex-col gap-10 pb-12">
      <div className="flex flex-col gap-5">
        <AnalyticsKpis kpis={headlineFigures(analytics)} />
        {bestRound && (
          <Card>
            <CardContent>
              <RoundPreview round={bestRound} variant="highlight" onClick={() => navigate(`/rounds/${bestRound.id}`)} />
            </CardContent>
          </Card>
        )}
      </div>

      <Section label="Scoring">
        <TrendCard
          title="Score Trend"
          description="5-round rolling average"
          points={scoreTrendPoints(analytics.scoreTrend)}
          series={[
            { label: "Score", tone: "primary" },
            { label: "5-round avg", tone: "neutral" },
          ]}
          reference={averageReference(analytics.kpis.scoring_average)}
        />
        <TrendCard
          title="Net Score Trend"
          description="Handicap-adjusted score per round"
          points={netScorePoints(sections.net_score_trend)}
          series={[{ label: "Net", tone: "primary" }]}
        />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score Mix</CardTitle>
            <CardDescription>Share of holes across these rounds</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreMixBar mix={analytics.scoreMixByKind} />
          </CardContent>
        </Card>
      </Section>

      <Section label="Ball Striking">
        <TrendCard
          title="GIR % per Round"
          description={analytics.girRoundsLeftOut ? "Rounds without GIR data excluded" : null}
          cardClassName={hasShortGame ? undefined : "lg:col-span-2"}
          points={girPoints(analytics.girTrend)}
          series={[{ label: "GIR", tone: "birdie" }]}
          format={percentLabel}
        />
        {hasShortGame && (
          <TrendCard
            title="Short Game"
            description="Scrambling % vs Up & Down %"
            points={shortGamePoints(analytics.shortGameTrend)}
            series={[
              { label: "Scrambling", tone: "eagle" },
              { label: "Up & Down", tone: "contrast" },
            ]}
            format={percentLabel}
          />
        )}
        {analytics.girSplit.length > 0 && <GirSplitCard split={analytics.girSplit} className="lg:col-span-2" />}
      </Section>

      <Section label="Putting">
        <TrendCard
          title="Total Putts per Round"
          cardClassName={hasThreePutts ? undefined : "lg:col-span-2"}
          points={puttsPoints(analytics.puttsTrend)}
          series={[{ label: "Putts", tone: "neutral" }]}
        />
        {hasThreePutts && (
          <TrendCard
            title="3-Putts per Round"
            description="Holes with 3+ putts"
            points={threePuttPoints(analytics.threePuttTrend)}
            series={[{ label: "3-Putts", tone: "bogey" }]}
          />
        )}
      </Section>

      <Section label="Performance Profile">
        <Card>
          <CardHeader>
            <CardTitle>Avg Score to Par by Hole Par</CardTitle>
          </CardHeader>
          <CardContent>
            <ToParBars bars={parBars(sections.scoring_by_par)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avg Score by Hole Difficulty</CardTitle>
            <CardDescription>Handicap 1 (hardest) → 18 (easiest)</CardDescription>
          </CardHeader>
          <CardContent>
            <ToParBars bars={handicapBars(sections.scoring_by_handicap)} />
          </CardContent>
        </Card>
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
