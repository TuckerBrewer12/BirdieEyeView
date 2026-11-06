import { HoleMetricBars } from "@/brand/charts/HoleMetricBars";
import { courseAnalyticsFrom } from "@/domain/courseAnalytics";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);

export default function HoleMetricBarsPreview() {
  return (
    <>
      <HoleMetricBars metric="gir" rows={analytics.gir} />
      <HoleMetricBars metric="putts" rows={analytics.putts} />
      <HoleMetricBars metric="variance" rows={analytics.variance} />
    </>
  );
}
