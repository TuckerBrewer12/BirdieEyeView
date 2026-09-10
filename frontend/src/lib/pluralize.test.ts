import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize";

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
});
