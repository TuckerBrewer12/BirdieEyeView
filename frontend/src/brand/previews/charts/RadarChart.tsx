import { ChevronDown } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { RadarChart, RadarSummary, type RadarAxis } from "@/brand/charts/RadarChart";

/** A 10-handicapper's six axes against a benchmark golfer: ahead on putting and the par types. */
const compared: RadarAxis[] = [
  { label: "Greens hit", value: 44, benchmark: 50, valueLabel: "44%", benchmarkLabel: "50%" },
  { label: "Scrambling", value: 38, benchmark: 45, valueLabel: "38%", benchmarkLabel: "45%" },
  { label: "Putting", value: 83, benchmark: 55, valueLabel: "1.84 / GIR", benchmarkLabel: "2.40" },
  { label: "Par 3s", value: 63, benchmark: 55, valueLabel: "+0.42", benchmarkLabel: "+0.63" },
  { label: "Par 4s", value: 61, benchmark: 50, valueLabel: "+0.48", benchmarkLabel: "+0.75" },
  { label: "Par 5s", value: 68, benchmark: 60, valueLabel: "+0.31", benchmarkLabel: "+0.50" },
];

const label = "text-label text-muted-foreground";

export default function RadarChartPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={label}>Player profile</span>
        <Card className="@container">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Player profile</CardTitle>
            <CardDescription className="text-body-sm">Last 20 rounds vs a benchmark golfer</CardDescription>
            <CardAction>
              <Button variant="outline" className="border-input bg-card text-body font-semibold">
                10 handicap
                <ChevronDown data-icon="inline-end" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:gap-3">
            <div className="@xl:w-3/5 @xl:shrink-0">
              <RadarChart
                axes={compared}
                aria-label="Radar of six skills: ahead of benchmark on putting and par 3, 4 and 5 scoring; behind on greens hit and scrambling"
              />
            </div>
            <RadarSummary axes={compared} against="a 10 handicap" className="@xl:flex-1" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>No comparison: the shape alone, on four axes</span>
        <div className="max-w-sm">
          <RadarChart
            axes={compared.slice(0, 4).map(({ label: axis, value, valueLabel }) => ({ label: axis, value, valueLabel }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Too few axes</span>
        <RadarChart axes={compared.slice(0, 2)} empty="Play a few more rounds to see your shape." />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>On a phone</span>
        <div className="max-w-xs">
          <RadarChart axes={compared} compact aria-label="Shape against a benchmark golfer, on a phone" />
        </div>
      </div>
    </div>
  );
}
