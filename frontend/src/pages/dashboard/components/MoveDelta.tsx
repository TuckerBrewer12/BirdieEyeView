import { StatDelta } from "@/brand";
import { moveOf } from "@/domain";
import type { ChangeVerdict } from "../model";

export function MoveDelta({ change, verdict, className }: { change: number | null; verdict: ChangeVerdict | null; className?: string }) {
  const move = moveOf(change);
  return (
    <StatDelta direction={move.direction} tone={verdict ?? "neutral"} className={className}>
      {move.amount}
    </StatDelta>
  );
}
