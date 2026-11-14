import { useState } from "react";
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

const scores = [92, 88, 85, 90, 84, 86, 81, 87, 83, 82, 85, 80];
const fives = [92, 90, 88.3, 88.8, 87.8, 86.6, 85.2, 85.6, 84.2, 83.8, 83.6, 83.4];
const birdies = [0, 1, 1, 0, 2, 1, 2, 1, 1, 3, 1, 2];
const doubles = [5, 3, 3, 4, 2, 3, 1, 3, 2, 2, 2, 1];

const percent = (value: number) => `${Math.round(value)}%`;

export default function TrendAreaChartPreview() {
  const [shown, setShown] = useState<number | null>(null);
  return (
    <>
      <TrendAreaChart
        shown={shown}
        onShownChange={setShown}
        points={girRates.map((rate, i) => round(i, [rate]))}
        series={[{ label: "GIR", tone: "birdie" }]}
        format={percent}
        reference={{ value: 36, label: "Avg 36%" }}
      />
      <TrendAreaChart
        points={scrambling.map((rate, i) => round(i, [rate, upAndDown[i]]))}
        series={[
          { label: "Scrambling", tone: "eagle" },
          { label: "Up & Down", tone: "contrast" },
        ]}
        format={percent}
        domain={[0, 100]}
      />
      <TrendAreaChart
        points={scores.map((score, i) => round(i, [score, fives[i]]))}
        series={[
          { label: "Score", tone: "neutral", mark: "dots" },
          { label: "5-round avg", tone: "primary" },
        ]}
        counts={[
          { kind: "birdie", label: "Birdies", values: birdies },
          { kind: "double", label: "Doubles", values: doubles },
        ]}
      />
      <TrendAreaChart points={[round(0, [31])]} series={[{ label: "Putts", tone: "neutral" }]} />
    </>
  );
}
