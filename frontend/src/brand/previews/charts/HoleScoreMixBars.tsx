import { HoleScoreMixBars } from "@/brand/charts/HoleScoreMixBars";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

export default function HoleScoreMixBarsPreview() {
  return <HoleScoreMixBars rows={halfMoonBayAnalytics.score_type_distribution_by_hole} />;
}
