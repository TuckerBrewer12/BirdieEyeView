import { ScoreTrendChart } from "@/brand/charts/ScoreTrendChart";
import type { CourseScoreTrendRowDto } from "@/types/api";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";

/** Six rounds on a par 72: over, level and under par dots, and one unscored round left out. */
const season: CourseScoreTrendRowDto[] = [
  [85, "2026-03-09"],
  [80, "2026-04-02"],
  [null, "2026-04-20"],
  [72, "2026-05-02"],
  [78, "2026-06-15"],
  [70, "2026-07-11"],
  [74, "2026-08-01"],
].map(([score, day], i) => ({
  round_index: i + 1,
  round_id: `round-${i + 1}`,
  date: `${day}T18:00:00.000Z`,
  total_score: score as number | null,
  to_par: score == null ? null : (score as number) - 72,
}));

export default function ScoreTrendChartPreview() {
  return (
    <>
      <ScoreTrendChart rows={season} />
      <ScoreTrendChart rows={halfMoonBayAnalytics.score_trend_on_course} />
      <ScoreTrendChart rows={season.slice(0, 1)} />
    </>
  );
}
