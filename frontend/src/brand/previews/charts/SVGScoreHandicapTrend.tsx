import { SVGScoreHandicapTrend } from "@/brand/charts/SVGScoreHandicapTrend";
import { trendPointsFrom } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";

const data = trendPointsFrom(populatedDashboard);

export default function SVGScoreHandicapTrendPreview() {
  return (
    <>
      <SVGScoreHandicapTrend data={data} />
      <div className="grid grid-cols-2 gap-3">
        <SVGScoreHandicapTrend data={data} series="score" compact />
        <SVGScoreHandicapTrend data={data} series="handicap" compact />
      </div>
      <SVGScoreHandicapTrend data={[]} />
    </>
  );
}
