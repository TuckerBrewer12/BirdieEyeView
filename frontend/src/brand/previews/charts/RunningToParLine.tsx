import { RunningToParLine } from "@/brand/charts/RunningToParLine";
import type { RunningToPar } from "@/domain";

/** The board's round: bogeys out, a birdie on 18, +6. */
const SIX_OVER = [1, 1, 1, 2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 6];
/** Under par most of the way, then a slip coming in. */
const UNDER = [0, -1, -1, -2, -2, -2, -2, -3, -3, -3, -3, -4, -4, -4, -4, -4, -4, -3];

const flow = (values: number[]): RunningToPar[] => values.map((toPar, i) => ({ hole: i + 1, toPar }));

export default function RunningToParLinePreview() {
  return (
    <div className="flex flex-col gap-6">
      <RunningToParLine flow={flow(SIX_OVER)} />
      <RunningToParLine flow={flow(UNDER)} />
      <RunningToParLine flow={flow(SIX_OVER.slice(0, 9))} />
      <RunningToParLine flow={flow(SIX_OVER)} compact />
    </div>
  );
}
