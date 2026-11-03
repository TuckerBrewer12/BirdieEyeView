import { describe, expect, it } from "vitest";
import {
  SCORE_KEYS,
  scoreColorClass,
  scoreFillClass,
  scoreOnFillClass,
  scoreSvgFillClass,
  scoreWashClass,
  toParBadgeClass,
  toParFill,
  toParSvgFillClass,
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

describe("score lookups for SVG and washes", () => {
  it("name each score's own utilities", () => {
    for (const key of SCORE_KEYS) {
      expect(scoreSvgFillClass(key)).toBe(`fill-score-${key}-base`);
      expect(scoreColorClass(key)).toBe(`text-score-${key}-base`);
      expect(scoreWashClass(key)).toBe(`bg-score-${key}-muted text-score-${key}-on-muted`);
    }
  });
});

describe("toParFill / toParSvgFillClass", () => {
  it("paint a round's to-par as par, eagle, birdie or bogey", () => {
    expect(toParFill(null)).toBe("var(--score-par-base)");
    expect(toParFill(0)).toBe("var(--score-par-base)");
    expect(toParFill(-2)).toBe("var(--score-eagle-base)");
    expect(toParFill(-1)).toBe("var(--score-birdie-base)");
    expect(toParFill(5)).toBe("var(--score-bogey-base)");
    expect(toParSvgFillClass(-1)).toBe("fill-score-birdie-base");
    expect(toParSvgFillClass(3)).toBe("fill-score-bogey-base");
  });
});
