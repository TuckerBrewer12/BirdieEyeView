import { ScoreGoalChart } from "@/brand/charts/ScoreGoalChart";

export default function ScoreGoalChartPreview() {
  return (
    <>
      {/* Breaking 90: three rounds reach it. */}
      <ScoreGoalChart scores={[96, 92, 89, 94, 91, 87, 93, 90, 88, 95]} goal={89} />
      {/* Breaking 80 with nothing under it yet: the goal sits below every dot. */}
      <ScoreGoalChart scores={[88, 85, 91, 86]} goal={79} />
      <ScoreGoalChart scores={[84]} goal={79} />
    </>
  );
}
