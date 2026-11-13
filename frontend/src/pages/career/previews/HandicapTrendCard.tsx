import { laterCareer, sampleCareer } from "@/testing/fixtures/career";
import { HandicapTrendCard } from "../components/HandicapTrendCard";

const lifetime = sampleCareer.windows.lifetime.handicapTrend;
const EMPTY = "No rounds in the last 365 days.";

export default function HandicapTrendCardPreview() {
  return (
    <>
      <HandicapTrendCard trend={lifetime} handicapIndex={sampleCareer.handicapIndex} empty={EMPTY} />
      {/* The last year only, ten months on: just the rounds the server marks as in it. */}
      <HandicapTrendCard
        trend={laterCareer.windows.one_year.handicapTrend}
        handicapIndex={laterCareer.handicapIndex}
        empty={EMPTY}
      />
      {/* A plus index, written the way golfers write it, in the phone's drawing. */}
      <HandicapTrendCard
        trend={lifetime.map((point) => ({
          ...point,
          handicapIndex: point.handicapIndex != null ? point.handicapIndex - 9 : null,
        }))}
        handicapIndex={-2}
        empty={EMPTY}
        compact
      />
      {/* Two rounds in: no index yet. */}
      <HandicapTrendCard trend={lifetime.slice(0, 2)} handicapIndex={null} empty={EMPTY} />
      {/* No rounds in the window. */}
      <HandicapTrendCard trend={[]} handicapIndex={8.4} empty={EMPTY} />
    </>
  );
}
