import type { ScanResult } from "@/types/scan";
import type { HoleEdits } from "./round";

/** How sure the scan has to be of a score for it to pass without a second look. */
const SURE = "high";

/**
 * The holes whose score the scan wasn't sure of and the golfer hasn't typed over yet, in hole order.
 *
 * Only strokes count. Putts, fairways and greens are often not on a card at all, so a gap there
 * is nothing to stop and check. A hole stops counting once the golfer types a score into it.
 */
export function strokesToCheck(scan: ScanResult, edits: HoleEdits = {}): number[] {
  return scan.confidence.hole_scores
    .filter((hole) => {
      const level = hole.fields.strokes?.level;
      return level != null && level !== SURE && edits[hole.hole_number]?.strokes == null;
    })
    .map((hole) => hole.hole_number)
    .sort((a, b) => a - b);
}
