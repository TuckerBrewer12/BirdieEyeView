import { benchmarkComparisonFrom } from "@/domain";
import { labAnalytics, labBenchmarks } from "@/testing/fixtures/lab";
import { ParTypeCard } from "../components/ParTypeCard";
import { parTypeRowsFrom } from "../model";

export default function ParTypeCardPreview() {
  return (
    <>
      <ParTypeCard rows={benchmarkComparisonFrom(labBenchmarks["handicap:15"]).parTypes} benchmarkName="Breaks 90" />
      {/* No comparison, and no par 5s played. */}
      <ParTypeCard
        rows={parTypeRowsFrom({ ...labAnalytics, scoring_by_par: labAnalytics.scoring_by_par.slice(0, 2) })}
        benchmarkName={null}
      />
    </>
  );
}
