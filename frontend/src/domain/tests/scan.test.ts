import { describe, expect, it } from "vitest";
import { scannedCard, UNSURE_HOLES, unsureCard } from "@/testing/fixtures/scan";
import type { ScanDto } from "@/types/api";
import { NO_CARD_FACTS, SCAN_STEPS, cardContext, cardRows, nameRowOf, scanStepAt, strokesToCheck } from "../scan";

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

describe("scanStepAt", () => {
  it("words each step of reading a card, and holds on the last", () => {
    expect(scanStepAt(0)).toEqual({ label: "Finding the course…", phase: 0 });
    expect(scanStepAt(2)).toEqual({ label: "Reading scores…", phase: 2 });
    expect(scanStepAt(9)).toEqual({ label: SCAN_STEPS.at(-1), phase: SCAN_STEPS.length - 1 });
  });
});

describe("cardContext", () => {
  it("says only that there are no putts, for a card the golfer said nothing about", () => {
    expect(cardContext(NO_CARD_FACTS)).toBe("no putts recorded");
  });

  it("names the golfer's row, the scores to par, and the rows the card has", () => {
    expect(cardContext({ name: " Tucker ", writtenAs: "toPar", putts: true, shotsToGreen: true })).toBe(
      "my name is Tucker. scores written to par. name on score row. row order: score, putts, shots to green",
    );
  });

  it("keeps the golfer's row order and name row, leaving out rows the card doesn't have", () => {
    const facts = {
      ...NO_CARD_FACTS,
      putts: true,
      rowOrder: ["shots", "putts", "score"] as const,
      nameRow: "putts" as const,
    };
    expect(cardContext(facts)).toBe("name on putts row. row order: putts, score");
  });

  it("puts the name on the score row when its row isn't on the card", () => {
    expect(cardContext({ ...NO_CARD_FACTS, putts: true, nameRow: "shots" })).toBe(
      "name on score row. row order: score, putts",
    );
  });
});

describe("cardRows", () => {
  it("puts a row turned on after the others were ordered last", () => {
    const facts = { ...NO_CARD_FACTS, putts: true, shotsToGreen: true, rowOrder: ["putts", "score"] as const };
    expect(cardRows(facts)).toEqual(["putts", "score", "shots"]);
  });
});

describe("nameRowOf", () => {
  const facts = {
    ...NO_CARD_FACTS,
    putts: true,
    shotsToGreen: false,
    rowOrder: ["putts", "score", "shots"] as const,
    nameRow: "shots" as const,
  };

  it("is the score row when the name's row is off the card, not the first row", () => {
    expect(nameRowOf(facts)).toBe("score");
  });

  it("is what the note says", () => {
    expect(cardContext(facts)).toContain("name on score row");
  });

  it("keeps the golfer's row while the card has it", () => {
    expect(nameRowOf({ ...facts, nameRow: "putts" })).toBe("putts");
  });
});
