import { describe, it, expect } from "vitest";
import { firstRoundComparison, roundComparison } from "@/testing/fixtures/roundDetails";
import { comparisonFrom } from "../roundDetailModel";

describe("comparisonFrom", () => {
  it("words each figure with its difference and the server's verdict", () => {
    const rows = comparisonFrom(roundComparison).l20?.rows ?? [];
    expect(rows.map((row) => [row.label, row.value, row.average, row.difference, row.verdict])).toEqual([
      ["Score", "78", "80.4", "−2.4", "good"],
      ["Putts", "32", "33.1", "−1.1", "good"],
      ["Greens hit", "7", "4.9", "+2.1", "good"],
      ["3-putts", "1", "1.9", "−0.9", "good"],
      ["Putts / GIR", "1.71", "1.95", "−0.24", "good"],
      ["Scrambling", "4", "2.6", "+1.4", "good"],
    ]);
    expect(comparisonFrom(roundComparison).l5?.rows[0]?.average).toBe("81.4");
  });

  it("has no rows for a round with nothing before it", () => {
    expect(comparisonFrom(firstRoundComparison).l20?.rows).toEqual([]);
  });
});
