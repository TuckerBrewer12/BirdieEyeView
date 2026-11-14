import type { ScanDto } from "@/types/api";
import type { HoleEdits } from "./round";

export const SCAN_STEPS = ["Finding the course…", "Reading tees…", "Reading scores…", "Double-checking…"] as const;

export const SCAN_STEP_HOLD_MS = 3500;

export function scanStepAt(phase: number): { label: string; phase: number } {
  const shown = Math.min(Math.max(phase, 0), SCAN_STEPS.length - 1);
  return { label: SCAN_STEPS[shown], phase: shown };
}

export type ScoresWrittenAs = "strokes" | "toPar";

export type CardRow = "score" | "putts" | "shots";

export interface CardFacts {
  name: string;
  writtenAs: ScoresWrittenAs;
  putts: boolean;
  shotsToGreen: boolean;
  rowOrder?: readonly CardRow[];
  nameRow?: CardRow;
}

export const NO_CARD_FACTS: CardFacts = { name: "", writtenAs: "strokes", putts: false, shotsToGreen: false };

const ROW_WORDS: Record<CardRow, string> = { score: "score", putts: "putts", shots: "shots to green" };

const ALL_ROWS: readonly CardRow[] = ["score", "putts", "shots"];

export function cardRows(facts: CardFacts): CardRow[] {
  const has = (row: CardRow) => row === "score" || (row === "putts" ? facts.putts : facts.shotsToGreen);
  const ordered = (facts.rowOrder ?? ALL_ROWS).filter(has);
  const added = ALL_ROWS.filter((row) => has(row) && !ordered.includes(row));
  return [...ordered, ...added];
}

export function nameRowOf(facts: CardFacts): CardRow {
  return facts.nameRow && cardRows(facts).includes(facts.nameRow) ? facts.nameRow : "score";
}

export function cardContext(facts: CardFacts): string {
  const parts: string[] = [];
  const name = facts.name.trim();
  if (name) parts.push(`my name is ${name}`);
  if (!facts.putts) parts.push("no putts recorded");
  if (facts.writtenAs === "toPar") parts.push("scores written to par");
  const rows = cardRows(facts);
  if (rows.length > 1) {
    parts.push(
      `name on ${ROW_WORDS[nameRowOf(facts)]} row`,
      `row order: ${rows.map((row) => ROW_WORDS[row]).join(", ")}`,
    );
  }
  return parts.join(". ");
}

const SURE = "high";

export function strokesToCheck(scan: ScanDto, edits: HoleEdits = {}): number[] {
  return scan.confidence.hole_scores
    .filter((hole) => {
      const level = hole.fields.strokes?.level;
      return level != null && level !== SURE && edits[hole.hole_number]?.strokes == null;
    })
    .map((hole) => hole.hole_number)
    .sort((a, b) => a - b);
}
