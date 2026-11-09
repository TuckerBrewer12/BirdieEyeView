import { Sparkline } from "@/brand/charts/Sparkline";
import { labAnalytics } from "@/testing/fixtures/lab";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";

const scores = (rows: { total_score: number | null }[]) => rows.map((row) => row.total_score);

export default function SparklinePreview() {
  return (
    <div className="flex flex-col gap-6">
      {/* The dashed line is the rounds' average as the server sent it: 76.8. */}
      <Sparkline series={[{ values: [85, 69, 72, 78, 80] }]} fill reference={76.8} />
      <Sparkline
        domain={[0, 100]}
        series={[
          { values: [30, 42, 38, 51, 44, 57, 49, 38], label: "Scr" },
          { values: [25, 33, null, 41, 36, 50, 47, 33], tone: "contrast", label: "U&D" },
        ]}
      />
      <Sparkline series={[{ values: [88] }]} />
      {/* The compact line a KPI tile draws, in the server's verdict on the move. */}
      <div className="flex gap-6">
        <Sparkline compact className="w-24" series={[{ values: scores(sampleGolfer.analytics.score_trend), tone: "good" }]} />
        <Sparkline compact className="w-24" series={[{ values: scores(labAnalytics.score_trend), tone: "bad" }]} />
      </div>
    </div>
  );
}
