import { benchmarkComparisonFrom, benchmarkShapeFrom, buildRadarData } from "@/domain";
import { averyLabAnalytics, breaks90Shape, labAnalytics, labBenchmarks, labGoalReport } from "@/testing/fixtures/lab";
import { PerformanceShapeCard, type PerformanceShapeCardProps } from "../components/PerformanceShapeCard";
import { labAnalyticsFrom, peakGameFrom } from "../model";

const avery = { id: "user-avery", name: "Avery Lin" };
const jordan = { id: "user-jordan", name: "Jordan Castellanos" };
const peak = peakGameFrom(labAnalytics, 89, labGoalReport);

const base: PerformanceShapeCardProps = {
  mode: "benchmark",
  onModeChange: () => {},
  peak,
  goalLabel: "Break 90",
  scoringAverage: 91.7,
  lowestScore: 89,
  recentTrend: 0.5,
  comparison: 15,
  handicaps: benchmarkComparisonFrom(labBenchmarks.alone).handicaps,
  onComparisonChange: () => {},
  friends: [avery, jordan],
  selectedFriend: avery,
  onSelectFriend: () => {},
  friendComparison: null,
  radar: buildRadarData(labAnalyticsFrom(labAnalytics).shape, benchmarkShapeFrom(breaks90Shape)),
  compared: true,
  missingAxes: [],
};

export default function PerformanceShapeCardPreview() {
  return (
    <>
      <PerformanceShapeCard {...base} />
      {/* A friend with too few rounds to draw: the shape alone, and why. */}
      <PerformanceShapeCard
        {...base}
        comparison="friend"
        selectedFriend={jordan}
        friendComparison="no-rounds"
        radar={buildRadarData(labAnalyticsFrom(averyLabAnalytics).shape).slice(0, 4)}
        compared={false}
        missingAxes={["Par 4s", "Par 5s"]}
      />
      <PerformanceShapeCard {...base} mode="peak" />
      {/* On a phone: one column, the radar's compact drawing under the controls. */}
      <div className="max-w-sm">
        <PerformanceShapeCard {...base} compact />
      </div>
    </>
  );
}
