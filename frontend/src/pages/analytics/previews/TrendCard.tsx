import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { TrendCard } from "../components/TrendCard";
import { analyticsFrom } from "../model";
import { averageReference, netScorePoints, scoreTrendPoints } from "../present";

const analytics = analyticsFrom(sampleGolfer.analytics);

export default function TrendCardPreview() {
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
        points={netScorePoints(analytics.sections.net_score_trend)}
        series={[{ label: "Net", tone: "primary" }]}
      />
    </>
  );
}
