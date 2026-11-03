import { StatTrend } from "@/brand/charts/StatTrend";
import { StatCard, type StatDirection, type StatTone } from "@/brand/components/Stat";

interface Metric {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  direction: StatDirection;
  tone: StatTone;
  values: number[];
}

const METRICS: Metric[] = [
  {
    label: "Scoring average",
    value: "79.4",
    delta: "1.8",
    direction: "down",
    tone: "good",
    values: [82, 81.5, 81.9, 80.8, 80.9, 80.2, 80.6, 79.9, 79.6, 79.4],
  },
  {
    label: "Greens in regulation",
    value: "44.2",
    unit: "%",
    delta: "3.1",
    direction: "up",
    tone: "good",
    values: [39, 40.5, 40, 41.6, 42, 41.2, 43, 43.4, 44.6, 44.2],
  },
  {
    label: "Putts per round",
    value: "31.6",
    delta: "0.4",
    direction: "up",
    tone: "bad",
    values: [31.1, 31.3, 31.0, 31.4, 31.2, 31.5, 31.4, 31.7, 31.5, 31.6],
  },
  {
    label: "3-putt rate",
    value: "8.3",
    unit: "%",
    delta: "1.2",
    direction: "down",
    tone: "good",
    values: [9.8, 9.5, 9.6, 9.1, 9.3, 8.9, 8.7, 8.8, 8.4, 8.3],
  },
];

export default function StatPreview() {
  return (
    <div className="flex flex-col gap-3">
      {METRICS.map((m) => (
        <StatCard
          key={m.label}
          label={m.label}
          period="L20"
          value={m.value}
          unit={m.unit}
          trend={<StatTrend values={m.values} tone={m.tone === "bad" ? "bad" : "good"} />}
          direction={m.direction}
          tone={m.tone}
          delta={m.delta}
          note="vs previous 20"
        />
      ))}
    </div>
  );
}
