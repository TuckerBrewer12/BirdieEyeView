import { describe, expect, it } from "vitest";
import { formatOneDecimal, formatPercent, pluralize, pluralNoun } from "../format";

describe("pluralNoun", () => {
  it("gives the bare noun, for callers that render the count themselves", () => {
    expect(pluralNoun(1, "Birdie")).toBe("Birdie");
    expect(pluralNoun(2, "Birdie")).toBe("Birdies");
    expect(pluralNoun(0, "Par")).toBe("Pars");
  });

  it("takes an explicit plural", () => {
    expect(pluralNoun(1, "Triple+", "Triples+")).toBe("Triple+");
    expect(pluralNoun(3, "Triple+", "Triples+")).toBe("Triples+");
  });
});

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "round")).toBe("1 round");
    expect(pluralize(1, "course")).toBe("1 course");
  });

  it("uses the plural for everything else, including zero", () => {
    expect(pluralize(0, "round")).toBe("0 rounds");
    expect(pluralize(2, "round")).toBe("2 rounds");
    expect(pluralize(12, "course")).toBe("12 courses");
  });

  it("takes an explicit plural for nouns that need one", () => {
    expect(pluralize(1, "birdie")).toBe("1 birdie");
    expect(pluralize(3, "bogey", "bogeys")).toBe("3 bogeys");
  });

  it("groups thousands", () => {
    expect(pluralize(1432, "hole")).toBe("1,432 holes");
  });
});

describe("formatPercent", () => {
  it("rounds to a whole percent by default", () => {
    expect(formatPercent(31.4)).toBe("31%");
    expect(formatPercent(31.5)).toBe("32%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("keeps the digits asked for", () => {
    expect(formatPercent(31.44, 1)).toBe("31.4%");
    expect(formatPercent(50, 1)).toBe("50.0%");
  });

  it("is a dash when there is nothing to show", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
    expect(formatPercent(Number.NaN)).toBe("—");
  });
});

describe("formatOneDecimal", () => {
  it("writes one decimal, or a dash", () => {
    expect(formatOneDecimal(82.44)).toBe("82.4");
    expect(formatOneDecimal(33)).toBe("33.0");
    expect(formatOneDecimal(null)).toBe("—");
  });
});
