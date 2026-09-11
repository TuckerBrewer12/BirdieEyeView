import { describe, expect, it } from "vitest";
import { chooseCompatibleTee, extractTeeColorToken } from "./teeColor";

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
