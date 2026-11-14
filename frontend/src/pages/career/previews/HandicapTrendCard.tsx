import { laterCareer, sampleCareer } from "@/testing/fixtures/career";
import { HandicapTrendCard } from "../components/HandicapTrendCard";

const lifetime = sampleCareer.windows.lifetime.handicapTrend;
const EMPTY = "No rounds in the last 365 days.";

export default function HandicapTrendCardPreview() {
  return (
    <>
      <HandicapTrendCard trend={lifetime} handicapIndex={sampleCareer.handicapIndex} empty={EMPTY} />
      <HandicapTrendCard
        trend={laterCareer.windows.one_year.handicapTrend}
        handicapIndex={laterCareer.handicapIndex}
        empty={EMPTY}
      />
      <HandicapTrendCard
        trend={lifetime.map((point) => ({
          ...point,
          handicapIndex: point.handicapIndex != null ? point.handicapIndex - 9 : null,
        }))}
        handicapIndex={-2}
        empty={EMPTY}
        compact
      />
      <HandicapTrendCard trend={lifetime.slice(0, 2)} handicapIndex={null} empty={EMPTY} />
      <HandicapTrendCard trend={[]} handicapIndex={8.4} empty={EMPTY} />
    </>
  );
}
