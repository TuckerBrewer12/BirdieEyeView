import { HoleMetricBars } from "@/brand/charts/HoleMetricBars";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

export default function HoleMetricBarsPreview() {
  return (
    <>
      <HoleMetricBars metric="gir" rows={halfMoonBayAnalytics.gir_percentage_by_hole} />
      <HoleMetricBars metric="putts" rows={halfMoonBayAnalytics.average_putts_by_hole} />
      <HoleMetricBars metric="variance" rows={halfMoonBayAnalytics.score_variance_by_hole} />
    </>
  );
}
