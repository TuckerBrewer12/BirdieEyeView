import { ScoreTargetChart } from "@/brand/charts/ScoreTargetChart";

// A spread of par 4 results: mostly pars and bogeys, a few birdies, the odd blow-up.
const results = [0, 1, 0, 1, 2, 0, -1, 1, 0, 1, 1, 0, 3, 0, 1, -1, 0, 2, 1, 0, 1, 0, 4, 1, 0, -2, 1, 0, 2, 1];

export default function ScoreTargetChartPreview() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <ScoreTargetChart shots={results.map((toPar, i) => ({ toPar, label: `${350 + (i % 5) * 9} yds` }))} />
      <ScoreTargetChart shots={[]} />
    </div>
  );
}
