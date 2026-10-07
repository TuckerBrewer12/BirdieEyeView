import { HoleToParBars } from "@/brand/charts/HoleToParBars";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

export default function HoleToParBarsPreview() {
  return (
    <>
      <HoleToParBars rows={halfMoonBayAnalytics.average_score_relative_to_par_by_hole} />
      <HoleToParBars rows={halfMoonBayAnalytics.course_difficulty_profile_by_hole} ranked />
    </>
  );
}
