import { SVGScoreHandicapTrend } from "@/brand/charts/SVGScoreHandicapTrend";
import { courseAnalyticsFrom, trendPointsFrom } from "@/domain";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

/** The sample golfer's last 20 rounds, as the dashboard sends them. */
const trend = trendPointsFrom(sampleGolfer.dashboard);
/** A golfer's rounds at one course, as the course page reads them. */
const course = courseAnalyticsFrom(halfMoonBayAnalytics);

/**
 * One panel alone, as the phone and the career page draw it; the course page's plain scores with
 * the best round marked; and the empty state.
 */
export default function SVGScoreHandicapTrendVariantsPreview() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SVGScoreHandicapTrend data={trend} series="score" compact />
        <SVGScoreHandicapTrend data={trend} series="handicap" compact />
      </div>
      <SVGScoreHandicapTrend data={course.scoreTrend} series="score" plain bestIndex={course.bestTrendIndex} />
      <SVGScoreHandicapTrend data={[]} />
    </>
  );
}
