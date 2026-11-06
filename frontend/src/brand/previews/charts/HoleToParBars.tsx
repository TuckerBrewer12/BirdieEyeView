import { HoleToParBars } from "@/brand/charts/HoleToParBars";
import { courseAnalyticsFrom } from "@/domain/courseAnalytics";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);

export default function HoleToParBarsPreview() {
  return (
    <>
      <HoleToParBars rows={analytics.holeToPar} />
      <HoleToParBars rows={analytics.difficulty} ranked />
    </>
  );
}
