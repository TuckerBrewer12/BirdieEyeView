import { HoleScoreMixBars } from "@/brand/charts/HoleScoreMixBars";
import { courseAnalyticsFrom } from "@/domain/courseAnalytics";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);

export default function HoleScoreMixBarsPreview() {
  return <HoleScoreMixBars rows={analytics.scoreMix} />;
}
