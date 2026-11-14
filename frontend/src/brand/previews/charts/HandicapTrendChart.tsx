import { HandicapTrendChart } from "@/brand/charts/HandicapTrendChart";
import { trendPointsFrom } from "@/domain";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

const trend = trendPointsFrom(sampleGolfer.dashboard);

export default function HandicapTrendChartPreview() {
  return (
    <>
      <HandicapTrendChart data={trend} />
      <div className="max-w-80">
        <HandicapTrendChart data={trend} compact />
      </div>
      <HandicapTrendChart data={[]} />
    </>
  );
}
