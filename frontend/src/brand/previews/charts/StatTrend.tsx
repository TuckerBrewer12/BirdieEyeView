import { StatTrend } from "@/brand/charts/StatTrend";

export default function StatTrendPreview() {
  return (
    <div className="flex items-center gap-6">
      <StatTrend values={[82, 81.5, 81.9, 80.8, 80.9, 80.2, 80.6, 79.9, 79.6, 79.4]} />
      <StatTrend tone="bad" values={[31.1, 31.3, 31.0, 31.4, 31.2, 31.5, 31.4, 31.7, 31.5, 31.6]} />
      <StatTrend values={[9.8, 9.5, null, 9.1, 9.3, 8.9, 8.7, 8.8, 8.4, 8.3]} />
    </div>
  );
}
