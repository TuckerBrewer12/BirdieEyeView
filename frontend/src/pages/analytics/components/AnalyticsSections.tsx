import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  RoundPreview,
  ScoreMixBar,
  ToParBars,
} from "@/brand";
import { formatPercent, type RoundSummary } from "@/domain";
import type { Analytics } from "../model";
import {
  averageReference,
  girPoints,
  handicapBars,
  netScorePoints,
  parBars,
  puttsPoints,
  scoreTrendPoints,
  shortGamePoints,
  threePuttPoints,
} from "../present";
import { GirSplitCard } from "./GirSplitCard";
import { TrendCard } from "./TrendCard";

interface SectionProps {
  analytics: Analytics;
}

export function BestRoundCard({ round }: { round: RoundSummary }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardContent>
        <RoundPreview round={round} variant="highlight" onClick={() => navigate(`/rounds/${round.id}`)} />
      </CardContent>
    </Card>
  );
}

export function ScoringCards({ analytics }: SectionProps) {
  return (
    <>
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
        points={netScorePoints(analytics.sections.net_score_trend)}
        series={[{ label: "Net", tone: "primary" }]}
      />
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Score Mix</CardTitle>
          <CardDescription>Share of holes across these rounds</CardDescription>
        </CardHeader>
        <CardContent>
          <ScoreMixBar mix={analytics.scoreMix} />
        </CardContent>
      </Card>
    </>
  );
}

export function BallStrikingCards({ analytics }: SectionProps) {
  const { sections } = analytics;
  const hasShortGame = sections.scrambling_trend.length > 0 || sections.up_and_down_trend.length > 0;

  return (
    <>
      <TrendCard
        title="GIR % per Round"
        description={analytics.girRoundsLeftOut ? "Rounds without GIR data excluded" : null}
        cardClassName={hasShortGame ? undefined : "lg:col-span-2"}
        points={girPoints(analytics.girTrend)}
        series={[{ label: "GIR", tone: "birdie" }]}
        format={formatPercent}
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
          format={formatPercent}
        />
      )}
      {analytics.girSplit.length > 0 && <GirSplitCard split={analytics.girSplit} className="lg:col-span-2" />}
    </>
  );
}

export function PuttingCards({ analytics }: SectionProps) {
  const hasThreePutts = analytics.threePuttTrend.length > 0;

  return (
    <>
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
    </>
  );
}

export function ProfileCards({ analytics }: SectionProps) {
  const { sections } = analytics;

  return (
    <>
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
    </>
  );
}
