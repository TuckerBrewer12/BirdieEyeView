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

/** How the golfer's scores are written on the card. */
export type ScoresWrittenAs = "strokes" | "toPar";

/** A row of figures on the card, under the hole numbers. */
export type CardRow = "score" | "putts" | "shots";

/** What the golfer says is on the card, so the scan knows where to look. */
export interface CardFacts {
  /** The golfer's name as written on the card, so the scan reads their row. */
  name: string;
  writtenAs: ScoresWrittenAs;
  putts: boolean;
  shotsToGreen: boolean;
  /** The card's rows top to bottom, when the golfer has put them in order. Unset: score, putts, shots. */
  rowOrder?: readonly CardRow[];
  /** The row the golfer's name sits beside. Unset: the score row. */
  nameRow?: CardRow;
}

export const NO_CARD_FACTS: CardFacts = { name: "", writtenAs: "strokes", putts: false, shotsToGreen: false };

const ROW_WORDS: Record<CardRow, string> = { score: "score", putts: "putts", shots: "shots to green" };

const ALL_ROWS: readonly CardRow[] = ["score", "putts", "shots"];

/**
 * The rows the card has, in the golfer's order: the score always, putts and shots to green when on
 * it. A row turned on after the golfer ordered the others goes last.
 */
export function cardRows(facts: CardFacts): CardRow[] {
  const has = (row: CardRow) => row === "score" || (row === "putts" ? facts.putts : facts.shotsToGreen);
  const ordered = (facts.rowOrder ?? ALL_ROWS).filter(has);
  const added = ALL_ROWS.filter((row) => has(row) && !ordered.includes(row));
  return [...ordered, ...added];
}

/**
 * The card's facts as the note the scan reads: whose row, how the scores are written, and, once
 * the card has more than scores, which row the name is on and the rows' order. The one place the
 * note is worded; the scan page and the landing page's try-it both send it.
 */
export function cardContext(facts: CardFacts): string {
  const parts: string[] = [];
  const name = facts.name.trim();
  if (name) parts.push(`my name is ${name}`);
  if (!facts.putts) parts.push("no putts recorded");
  if (facts.writtenAs === "toPar") parts.push("scores written to par");
  const rows = cardRows(facts);
  if (rows.length > 1) {
    const nameRow = facts.nameRow && rows.includes(facts.nameRow) ? facts.nameRow : "score";
    parts.push(`name on ${ROW_WORDS[nameRow]} row`, `row order: ${rows.map((row) => ROW_WORDS[row]).join(", ")}`);
  }
  return parts.join(". ");
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
