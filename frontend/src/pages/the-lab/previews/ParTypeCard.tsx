import { benchmarkComparisonFrom } from "@/domain";
import { labBenchmarks } from "@/testing/fixtures/lab";
import { ParTypeCard } from "../components/ParTypeCard";

const [par3, par4, par5] = benchmarkComparisonFrom(labBenchmarks.alone).parTypes;

export default function ParTypeCardPreview() {
  return (
    <>
      <ParTypeCard rows={benchmarkComparisonFrom(labBenchmarks["handicap:15"]).parTypes} benchmarkName="Breaks 90" />
      {/* No comparison, and no par 5s played. */}
      <ParTypeCard
        rows={[par3, par4, { ...par5, averageToPar: null }]}
        benchmarkName={null}
      />
    </>
  );
}
