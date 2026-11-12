import { StatDelta } from "@/brand";
import { moveOf } from "@/domain";
import type { ChangeVerdict } from "../model";

/** A figure's move with the server's verdict on it: "▼ 1.6", in the tone StatDelta gives the verdict. */
export function MoveDelta({ change, verdict, className }: { change: number | null; verdict: ChangeVerdict | null; className?: string }) {
  const move = moveOf(change);
  return (
    <StatDelta direction={move.direction} tone={verdict ?? "neutral"} className={className}>
      {move.amount}
    </StatDelta>
  );
}
