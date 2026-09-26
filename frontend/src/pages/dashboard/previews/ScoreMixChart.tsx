import { ScoreMixChart } from "../components/ScoreMixChart";

export default function ScoreMixChartPreview() {
  return (
    <div className="flex flex-col gap-4">
      <ScoreMixChart
        mix={[
          { name: "birdie", value: 10 },
          { name: "par", value: 40 },
          { name: "bogey", value: 35 },
          { name: "double", value: 10 },
          { name: "triple", value: 5 },
        ]}
      />
      <ScoreMixChart mix={[]} />
    </div>
  );
}
