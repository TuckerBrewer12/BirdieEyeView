import { describe, expect, it } from "vitest";
import { chooseCompatibleTee, extractTeeColorToken, teeSwatchClass, teeSwatchTextClass } from "./teeColor";

describe("extractTeeColorToken", () => {
  it("finds a color word inside a tee name", () => {
    expect(extractTeeColorToken("Blue tees")).toBe("blue");
    expect(extractTeeColorToken("championship")).toBeNull();
  });
});

describe("chooseCompatibleTee", () => {
  it("matches an exact tee, then the same color word", () => {
    expect(chooseCompatibleTee("Blue", ["Blue", "White"])).toBe("Blue");
    expect(chooseCompatibleTee("blue tees", ["Blue", "White"])).toBe("Blue");
    expect(chooseCompatibleTee("Gold", ["Blue", "White"])).toBeNull();
  });
});

describe("teeSwatchClass", () => {
  it("maps named tees onto brand fills", () => {
    expect(teeSwatchClass("Blue")).toBe("bg-score-double");
    expect(teeSwatchClass("white")).toBe("bg-card ring-1 ring-border");
    expect(teeSwatchClass(null)).toBe("bg-muted");
  });
});

describe("teeSwatchTextClass", () => {
  it("keeps light tees on a dark-readable foreground", () => {
    expect(teeSwatchTextClass("gold")).toBe("text-foreground");
    expect(teeSwatchTextClass("Blue")).toBe("text-primary-foreground");
  });
});
