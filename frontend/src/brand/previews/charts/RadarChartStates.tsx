import { RadarChart } from "@/brand/charts/RadarChart";
import { compared } from "./radarSample";

const label = "text-label text-muted-foreground";

/** The radar's other states, at the stage's phone width. */
export default function RadarChartStatesPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={label}>No comparison: the shape alone, on four axes</span>
        <RadarChart
          axes={compared.slice(0, 4).map(({ label: axis, value, valueLabel }) => ({ label: axis, value, valueLabel }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Too few axes</span>
        <RadarChart axes={compared.slice(0, 2)} empty="Play a few more rounds to see your shape." />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>On a phone</span>
        <RadarChart axes={compared} compact aria-label="Shape against a benchmark golfer, on a phone" />
      </div>
    </div>
  );
}
