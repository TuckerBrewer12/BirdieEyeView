import { sampleCareer } from "@/testing/fixtures/career";
import { HandicapTrendCard } from "../components/HandicapTrendCard";

export default function HandicapTrendCardPreview() {
  return (
    <>
      <HandicapTrendCard
        trend={sampleCareer.handicapTrend}
        handicapIndex={sampleCareer.handicapIndex}
        roundCount={sampleCareer.roundCount}
      />
      {/* A plus index, written the way golfers write it, in the phone's drawing. */}
      <HandicapTrendCard
        trend={sampleCareer.handicapTrend.map((point) => ({
          ...point,
          handicapIndex: point.handicapIndex != null ? point.handicapIndex - 9 : null,
        }))}
        handicapIndex={-2}
        roundCount={sampleCareer.roundCount}
        compact
      />
      {/* Two rounds in: no index yet. */}
      <HandicapTrendCard trend={sampleCareer.handicapTrend.slice(0, 2)} handicapIndex={null} roundCount={2} />
    </>
  );
}
