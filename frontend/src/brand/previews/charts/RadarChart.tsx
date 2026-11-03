import { ChevronDown } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/brand/components/Card";
import { RadarChart, RadarSummary } from "@/brand/charts/RadarChart";
import { compared } from "./radarSample";

/**
 * The Player profile card at the width it is used: the chart with its summary beside it.
 * It fills the window instead of the stage, which is only a phone wide; capture it at 640 wide.
 * The other states are in `RadarChartStates`.
 */
export default function RadarChartPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 overflow-auto bg-background p-6">
      <Card className="@container gap-1.5 py-4.5">
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
        <CardContent className="-my-3 flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:gap-3">
          <div className="@xl:w-100 @xl:shrink-0">
            <RadarChart
              axes={compared}
              aria-label="Radar of six skills: ahead of benchmark on putting and par 3, 4 and 5 scoring; behind on greens hit and scrambling"
            />
          </div>
          <RadarSummary axes={compared} against="a 10 handicap" className="@xl:flex-1" />
        </CardContent>
      </Card>
    </div>
  );
}
