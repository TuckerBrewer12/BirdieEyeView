import type { ScanDto } from "@/types/api";
import type { HoleEdits } from "./round";

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
