import type { ScanDto } from "@/types/api";
import type { HoleEdits } from "./round";

/**
 * The steps of reading a card, as the scan screens word them. The scan reports no progress, so
 * each is held for `SCAN_STEP_HOLD_MS` rather than reported.
 */
export const SCAN_STEPS = ["Finding the course…", "Reading tees…", "Reading scores…", "Double-checking…"] as const;

export const SCAN_STEP_HOLD_MS = 3500;

/** The step showing `phase` steps in, held on the last once there are no more. */
export function scanStepAt(phase: number): { label: string; phase: number } {
  const shown = Math.min(Math.max(phase, 0), SCAN_STEPS.length - 1);
  return { label: SCAN_STEPS[shown], phase: shown };
}

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
