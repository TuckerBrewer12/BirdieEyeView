import { SVGScoreHandicapTrend } from "@/brand/charts/SVGScoreHandicapTrend";
import { trend } from "../scoreHandicapSample";

/** One panel alone, as the phone and the career page draw it, and the empty state. */
export default function SVGScoreHandicapTrendVariantsPreview() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SVGScoreHandicapTrend data={trend} series="score" compact />
        <SVGScoreHandicapTrend data={trend} series="handicap" compact />
      </div>
      <SVGScoreHandicapTrend data={[]} />
    </>
  );
}
