import { SVGScoreHandicapTrend } from "@/brand/components/SVGScoreHandicapTrend";
import { colors } from "@/brand/theme";
import { populatedAnalytics } from "@/testing/fixtures/dashboard";

const data = populatedAnalytics.score_trend.map((row, i) => ({
  ...row,
  handicap_index: populatedAnalytics.handicap_trend[i]?.handicap_index ?? null,
  used_in_hi: populatedAnalytics.handicap_trend[i]?.used_in_hi ?? null,
  differential: populatedAnalytics.handicap_trend[i]?.differential ?? null,
  hi_threshold: populatedAnalytics.handicap_trend[i]?.hi_threshold ?? null,
}));

export default function SVGScoreHandicapTrendPreview() {
  return (
    <>
      <SVGScoreHandicapTrend
        data={data}
        scoreColor={colors.primary}
        handicapColor={colors.score.double.text}
        gridColor={colors.border}
      />
      <SVGScoreHandicapTrend
        data={[]}
        scoreColor={colors.primary}
        handicapColor={colors.score.double.text}
        gridColor={colors.border}
      />
    </>
  );
}
