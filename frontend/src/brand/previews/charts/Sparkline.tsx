import { Sparkline } from "@/brand/charts/Sparkline";

export default function SparklinePreview() {
  return (
    <div className="flex flex-col gap-6">
      <Sparkline series={[{ values: [85, 69, 72, 78, 80] }]} fill mean />
      <Sparkline
        domain={[0, 100]}
        series={[
          { values: [30, 42, 38, 51, 44, 57, 49, 38], label: "Scr" },
          { values: [25, 33, null, 41, 36, 50, 47, 33], tone: "contrast", label: "U&D" },
        ]}
      />
      <Sparkline series={[{ values: [88] }]} />
    </div>
  );
}
