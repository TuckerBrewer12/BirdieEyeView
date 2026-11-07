import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  formatOneDecimal,
  formatPercent,
  formatSignedOneDecimal,
  formatUpToOneDecimal,
  formatWhole,
  initialsOf,
  pluralize,
  pluralNoun,
} from "../format";

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

describe("formatWhole", () => {
  it("rounds to a whole number, or a dash", () => {
    expect(formatWhole(31.4)).toBe("31");
    expect(formatWhole(31.5)).toBe("32");
    expect(formatWhole(null)).toBe("—");
  });
});

describe("formatFileSize", () => {
  it("writes whole kilobytes", () => {
    expect(formatFileSize(421_888)).toBe("412 KB");
    expect(formatFileSize(300)).toBe("0 KB");
  });
});

describe("initialsOf", () => {
  it("takes the first letters of the first two words", () => {
    expect(initialsOf("avery lin")).toBe("AL");
    expect(initialsOf("Jordan Castellanos Whitfield")).toBe("JC");
    expect(initialsOf("  Sam  ")).toBe("S");
  });

  it("falls back to ? with no name, or to the caller's letter", () => {
    expect(initialsOf(null)).toBe("?");
    expect(initialsOf("   ")).toBe("?");
    expect(initialsOf(undefined, "G")).toBe("G");
  });
});

describe("formatSignedOneDecimal", () => {
  it("signs a gain and a loss to one decimal", () => {
    expect(formatSignedOneDecimal(1.23)).toBe("+1.2");
    expect(formatSignedOneDecimal(-0.44)).toBe("-0.4");
  });

  it("gives no sign to a figure that rounds to zero", () => {
    expect(formatSignedOneDecimal(0)).toBe("0.0");
    expect(formatSignedOneDecimal(-0.04)).toBe("0.0");
    expect(formatSignedOneDecimal(0.04)).toBe("0.0");
  });
});

describe("formatUpToOneDecimal", () => {
  it("drops the decimal from a whole figure", () => {
    expect(formatUpToOneDecimal(12)).toBe("12");
    expect(formatUpToOneDecimal(12.04)).toBe("12");
    expect(formatUpToOneDecimal(4.46)).toBe("4.5");
    expect(formatUpToOneDecimal(null)).toBe("—");
  });
});
