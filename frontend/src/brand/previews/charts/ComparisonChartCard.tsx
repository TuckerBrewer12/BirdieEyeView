import { ComparisonChartCard } from "@/brand/charts/ComparisonChartCard";

/** Integer headline, four cohorts, first bar selected. */
const score = [
  { label: "This round", value: 78, sampleSize: 1 },
  { label: "Last 5", value: 81.4, sampleSize: 5 },
  { label: "Last 20", value: 83.2, sampleSize: 20 },
  { label: "All time", value: 84.9, sampleSize: 42 },
];

/** One-decimal headline, shorter series. */
const putts = [
  { label: "This round", value: 1.7, sampleSize: 1 },
  { label: "Last 5", value: 1.9, sampleSize: 5 },
];

export default function ComparisonChartCardPreview() {
  return (
    <>
      <ComparisonChartCard title="Score" primaryLabel="score" bars={score} />
      <ComparisonChartCard title="Putts per GIR" primaryLabel="putts/GIR" bars={putts} />
      {/* A missing figure still renders a card; the headline is an em dash. */}
      <ComparisonChartCard
        title="GIR"
        primaryLabel="GIR"
        bars={[{ label: "This round", value: null, sampleSize: 0 }]}
      />
    </>
  );
}
