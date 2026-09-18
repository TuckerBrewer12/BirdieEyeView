import { describe, expect, it } from "vitest";
import { formatRoundDateHistory, formatRoundDateLong, formatRoundDateShort, formatRoundDateTick, roundDateParts } from "./roundDate";

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

describe("formatRoundDateShort", () => {
  it("reads month day", () => {
    expect(formatRoundDateShort("2026-06-15T00:00:00")).toBe("Jun 15");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatRoundDateShort(null)).toBeNull();
    expect(formatRoundDateShort("not a date")).toBeNull();
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

describe("formatRoundDateHistory", () => {
  it("reads month day, year in UTC", () => {
    expect(formatRoundDateHistory("2026-06-15T00:00:00.000Z")).toBe("Jun 15, 2026");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatRoundDateHistory(null)).toBeNull();
    expect(formatRoundDateHistory("not a date")).toBeNull();
  });
});

describe("formatRoundDateTick", () => {
  it("reads MM-DD from the ISO date, not the local clock", () => {
    expect(formatRoundDateTick("2026-03-09T18:00:00.000Z")).toBe("03-09");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatRoundDateTick(null)).toBeNull();
    expect(formatRoundDateTick("Monday")).toBeNull();
  });
});
