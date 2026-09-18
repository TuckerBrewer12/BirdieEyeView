import { describe, expect, it } from "vitest";
import { toParBadgeClass, toParTextClass } from "./score";

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
