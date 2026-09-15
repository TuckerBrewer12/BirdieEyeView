import { describe, expect, it } from "vitest";
import { formatRoundDateLong, roundDateParts } from "./roundDate";

describe("formatRoundDateLong", () => {
  it("reads weekday · month day · year", () => {
    expect(formatRoundDateLong("2026-06-15T00:00:00")).toBe("Mon · Jun 15 · 2026");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatRoundDateLong(null)).toBeNull();
    expect(formatRoundDateLong(undefined)).toBeNull();
    expect(formatRoundDateLong("")).toBeNull();
    expect(formatRoundDateLong("not a date")).toBeNull();
  });
});

describe("roundDateParts", () => {
  it("splits into calendar-tile parts", () => {
    expect(roundDateParts("2026-06-15T00:00:00")).toEqual({
      month: "JUN",
      day: "15",
      year: "'26",
    });
  });

  it("is null for a missing or unparseable date", () => {
    expect(roundDateParts(null)).toBeNull();
    expect(roundDateParts("not a date")).toBeNull();
  });
});
