import { RadarChart, type RadarAxis } from "@/brand/charts/RadarChart";

/** A mid-handicapper's six axes against a break-80 shape. */
const compared: RadarAxis[] = [
  { label: "GIR", value: 38, benchmark: 44, valueLabel: "38%", benchmarkLabel: "44%" },
  { label: "Scrambling", value: 29, benchmark: 41, valueLabel: "29%", benchmarkLabel: "41%" },
  { label: "Putting", value: 71, benchmark: 78, valueLabel: "2.08/GIR", benchmarkLabel: "1.94/GIR" },
  { label: "Par 3s", value: 58, benchmark: 72, valueLabel: "+0.6", benchmarkLabel: "+0.2" },
  { label: "Par 4s", value: 48, benchmark: 60, valueLabel: "+0.8", benchmarkLabel: "+0.5" },
  { label: "Par 5s", value: 64, benchmark: 58, valueLabel: "+0.4", benchmarkLabel: "+0.5" },
];

export default function RadarChartPreview() {
  return (
    <>
      <RadarChart axes={compared} aria-label="Shape against a break-80 golfer" />
      {/* No comparison: the shape alone, on four axes. */}
      <RadarChart
        axes={compared.slice(0, 4).map(({ label, value, valueLabel }) => ({ label, value, valueLabel }))}
      />
      <RadarChart axes={compared.slice(0, 2)} empty="Play a few more rounds to see your shape." />
    </>
  );
}
