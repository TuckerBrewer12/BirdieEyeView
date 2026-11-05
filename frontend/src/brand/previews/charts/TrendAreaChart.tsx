import { TrendAreaChart, type TrendAreaPoint } from "@/brand/charts/TrendAreaChart";

const girRates = [28, 11, 11, 22, 22, 39, 22, 39, 28, 33, 44, 28, 50, 39, 33, 44, 56, 61, 44, 50];
const scrambling = [20, 33, 25, null, 40, 50, 17, 33, 60, 25, 40, 20];
const upAndDown = [25, 40, 33, 50, 33, 60, 25, 40, 50, 33, 50, 40];

const round = (i: number, values: (number | null)[]): TrendAreaPoint => ({
  tick: i + 1,
  title: `Round ${i + 1}`,
  subtitle: i % 2 ? "Presidio Golf Course" : "Half Moon Bay Golf Links",
  values,
});

const percent = (value: number) => `${Math.round(value)}%`;

export default function TrendAreaChartPreview() {
  return (
    <>
      {/* One figure over a fill, against its average. */}
      <TrendAreaChart
        points={girRates.map((rate, i) => round(i, [rate]))}
        series={[{ label: "GIR", tone: "birdie" }]}
        format={percent}
        reference={{ value: 36, label: "Avg 36%" }}
      />
      {/* Two figures side by side, with a gap where a round has none. */}
      <TrendAreaChart
        points={scrambling.map((rate, i) => round(i, [rate, upAndDown[i]]))}
        series={[
          { label: "Scrambling", tone: "eagle" },
          { label: "Up & Down", tone: "contrast" },
        ]}
        format={percent}
        domain={[0, 100]}
      />
      <TrendAreaChart points={[round(0, [31])]} series={[{ label: "Putts", tone: "neutral" }]} />
    </>
  );
}
