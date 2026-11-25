import { describe, expect, it } from "vitest";
import { Round } from "@/domain";
import { scannedCard, scannedTeeCard } from "@/testing/fixtures/scan";
import type { ScannedRoundDto } from "@/types/api";
import { scannedRoundLine } from "../present";

function withStrokes(card: ScannedRoundDto, strokes: (hole: number) => number | null): ScannedRoundDto {
  return {
    ...card,
    hole_scores: card.hole_scores.map((score) => ({ ...score, strokes: strokes(score.hole_number) })),
  };
}

describe("scannedRoundLine", () => {
  it("gives the score, its to-par and the putts", () => {
    expect(scannedRoundLine(Round.fromScan(scannedCard.round))).toBe("You shot 79 (+8) with 34 putts.");
  });

  it("leaves the putts out when the card has none", () => {
    expect(scannedRoundLine(Round.fromScan(scannedTeeCard))).toBe("You shot 81 (+9).");
  });

  it("writes level par as E", () => {
    const pars = new Map(scannedCard.round.course?.holes.map((hole) => [hole.number, hole.par]));
    const level = withStrokes(scannedCard.round, (hole) => pars.get(hole) ?? null);
    expect(scannedRoundLine(Round.fromScan(level))).toBe("You shot 71 (E) with 34 putts.");
  });

  it("is null when the card gave no score", () => {
    expect(scannedRoundLine(Round.fromScan(withStrokes(scannedCard.round, () => null)))).toBeNull();
    expect(scannedRoundLine(null)).toBeNull();
  });
});
