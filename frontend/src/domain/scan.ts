import type { ScanDto } from "@/types/api";
import type { HoleEdits } from "./round";

/**
 * The steps of reading a card, in order, as the scan's progress card lists them. Both the scan
 * page and the landing page's try-it demo walk through these; their count paces them.
 */
export const SCAN_STEPS = ["Course and tees", "Scores and putts", "Yardages and par", "Checking totals"] as const;

/** The scan reports no progress, so each step is held this long rather than reported. */
export const SCAN_STEP_HOLD_MS = 3500;

/** How sure the scan has to be of a score for it to pass without a second look. */
const SURE = "high";

/**
 * The holes whose score the scan wasn't sure of and the golfer hasn't typed over yet, in hole order.
 *
 * Only strokes count. Putts, fairways and greens are often not on a card at all, so a gap there
 * is nothing to stop and check. A hole stops counting once the golfer types a score into it.
 */
export function strokesToCheck(scan: ScanDto, edits: HoleEdits = {}): number[] {
  return scan.confidence.hole_scores
    .filter((hole) => {
      const level = hole.fields.strokes?.level;
      return level != null && level !== SURE && edits[hole.hole_number]?.strokes == null;
    })
    .map((hole) => hole.hole_number)
    .sort((a, b) => a - b);
}
