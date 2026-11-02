import { describe, expect, it } from "vitest";
import { scannedCard, UNSURE_HOLES, unsureCard } from "@/testing/fixtures/scan";
import type { ScanDto } from "@/types/api";
import { strokesToCheck } from "../scan";

describe("strokesToCheck", () => {
  it("is empty for a card the scan read cleanly", () => {
    expect(strokesToCheck(scannedCard)).toEqual([]);
  });

  it("lists the holes whose score the scan wasn't sure of, in hole order", () => {
    expect(strokesToCheck(unsureCard)).toEqual(UNSURE_HOLES);
  });

  it("ignores putts the scan wasn't sure of", () => {
    const putts = unsureCard.confidence.hole_scores.find((hole) => hole.hole_number === 2);
    expect(putts?.fields.putts?.level).toBe("very_low");
    expect(strokesToCheck(unsureCard)).not.toContain(2);
  });

  it("counts a score read with medium confidence", () => {
    const medium: ScanDto = {
      ...scannedCard,
      confidence: {
        ...scannedCard.confidence,
        hole_scores: [
          {
            hole_number: 7,
            overall: 0.7,
            level: "medium",
            fields: {
              strokes: { final_confidence: 0.7, level: "medium", validation_flags: [] },
              putts: null,
              green_in_regulation: null,
            },
          },
        ],
      },
    };
    expect(strokesToCheck(medium)).toEqual([7]);
  });

  it("drops a hole once the golfer types a score into it, but not putts or a cleared cell", () => {
    expect(strokesToCheck(unsureCard, { 4: { strokes: 5 } })).toEqual([11]);
    expect(strokesToCheck(unsureCard, { 4: { putts: 2 }, 11: { strokes: null } })).toEqual(UNSURE_HOLES);
  });
});
