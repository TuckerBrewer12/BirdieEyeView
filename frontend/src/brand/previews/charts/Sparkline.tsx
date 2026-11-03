import { Sparkline } from "@/brand/charts/Sparkline";
import { Card } from "@/brand/components/Card";

export default function SparklinePreview() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex-row items-center gap-2.5 px-4">
        <Sparkline stretch className="h-6 w-24 shrink-0" series={[{ values: [19, 16, 17, 12, 13, 9, 6], tone: "birdie" }]} />
        <span className="text-label font-semibold text-muted-foreground">Sparkline · trend only, no axes</span>
      </Card>
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
    </div>
  );
}
