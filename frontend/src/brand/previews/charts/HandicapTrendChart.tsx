import { HandicapTrendChart } from "@/brand/charts/HandicapTrendChart";
import { trendPointsFrom } from "@/domain";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

/** The sample golfer's last 20 rounds, as the dashboard sends them. */
const trend = trendPointsFrom(sampleGolfer.dashboard);

/** The career page's line at full width and on a phone, and the empty state. */
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
