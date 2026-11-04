import { RadarSummary } from "@/brand/components/RadarSummary";
import { compared } from "../charts/radarSample";

const label = "text-label text-muted-foreground";

/** The column beside the radar: the count, the biggest gaps, and the legend. */
export default function RadarSummaryPreview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className={label}>Ahead on four of six</span>
        <RadarSummary axes={compared} against="a 10 handicap" />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>Ahead on every area</span>
        <RadarSummary axes={compared.map((axis) => ({ ...axis, value: 80 }))} against="a 10 handicap" />
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>No comparison</span>
        <RadarSummary
          axes={compared.map(({ label: axis, value, valueLabel }) => ({ label: axis, value, valueLabel }))}
          against="a 10 handicap"
        />
      </div>
    </div>
  );
}
