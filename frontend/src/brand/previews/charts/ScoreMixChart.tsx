import { ScoreMixChart } from "@/brand/charts/ScoreMixChart";

export default function ScoreMixChartPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ScoreMixChart mix={{ eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 }} />
      <ScoreMixChart mix={null} />
    </div>
  );
}
