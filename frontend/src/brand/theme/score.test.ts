import { describe, expect, it } from "vitest";
import {
  SCORE_KEYS,
  scoreFillClass,
  scoreKindLabel,
  scoreOnFillClass,
  toParBadgeClass,
  toParTextClass,
} from "./score";

describe("toParTextClass", () => {
  it("splits under, even, and over par", () => {
    expect(toParTextClass(-1)).toBe("text-score-birdie");
    expect(toParTextClass(0)).toBe("text-muted-foreground");
    expect(toParTextClass(2)).toBe("text-score-bogey");
    expect(toParTextClass(null)).toBe("text-muted-foreground");
  });
});

describe("toParBadgeClass", () => {
  it("splits under, even, and over par", () => {
    expect(toParBadgeClass(-2)).toBe("bg-accent text-score-birdie");
    expect(toParBadgeClass(0)).toBe("bg-muted text-muted-foreground");
    expect(toParBadgeClass(3)).toBe("bg-destructive/10 text-score-bogey");
    expect(toParBadgeClass(null)).toBe("bg-muted text-muted-foreground");
  });
});

describe("scoreFillClass", () => {
  it("paints every score with its own base token", () => {
    for (const key of SCORE_KEYS) {
      expect(scoreFillClass(key)).toBe(`bg-score-${key}-base`);
    }
  });
});

describe("scoreOnFillClass", () => {
  it("names the text utility that reads on each score's fill", () => {
    for (const key of SCORE_KEYS) {
      expect(scoreOnFillClass(key)).toBe(`text-score-${key}-on-base`);
    }
  });
});

describe("scoreKindLabel", () => {
  it("names each score type, open-ended at both ends", () => {
    expect(SCORE_KEYS.map((key) => scoreKindLabel(key))).toEqual([
      "Eagle+", "Birdie", "Par", "Bogey", "Double", "Triple", "Quad+",
    ]);
  });

  it("takes the plural for any count but one", () => {
    expect(scoreKindLabel("birdie", 3)).toBe("Birdies");
    expect(scoreKindLabel("eagle", 2)).toBe("Eagles+");
    expect(scoreKindLabel("par", 0)).toBe("Pars");
    expect(scoreKindLabel("bogey", 1)).toBe("Bogey");
  });
});
