import type { RadarAxis } from "@/brand/charts/RadarChart";

/** A 10-handicapper's six axes against a benchmark golfer: ahead on putting and the par types. */
export const compared: RadarAxis[] = [
  { label: "Greens hit", value: 44, benchmark: 50, valueLabel: "44%", benchmarkLabel: "50%" },
  { label: "Scrambling", value: 38, benchmark: 45, valueLabel: "38%", benchmarkLabel: "45%" },
  { label: "Putting", value: 83, benchmark: 55, valueLabel: "1.84 / GIR", benchmarkLabel: "2.40" },
  { label: "Par 3s", value: 63, benchmark: 55, valueLabel: "+0.42", benchmarkLabel: "+0.63" },
  { label: "Par 4s", value: 61, benchmark: 50, valueLabel: "+0.48", benchmarkLabel: "+0.75" },
  { label: "Par 5s", value: 68, benchmark: 60, valueLabel: "+0.31", benchmarkLabel: "+0.50" },
];
