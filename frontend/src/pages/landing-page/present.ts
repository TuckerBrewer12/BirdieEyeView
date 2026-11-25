import { pluralize } from "@/domain/format";
import { toParLabel } from "@/domain";
import type { Round } from "@/domain";

export const SIGN_UP_OFFER = {
  title: "Track every round you play.",
  detail: "Sign up free, then scan this card again to save it to your rounds.",
} as const;

export function scannedRoundLine(round: Round | null): string | null {
  if (round?.score == null) return null;
  const toPar = toParLabel(round.toPar);
  const score = toPar ? `${round.score} (${toPar})` : `${round.score}`;
  const putts = round.putts == null ? "" : ` with ${pluralize(round.putts, "putt")}`;
  return `You shot ${score}${putts}.`;
}
