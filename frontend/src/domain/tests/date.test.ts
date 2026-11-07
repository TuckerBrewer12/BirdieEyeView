import { describe, expect, it } from "vitest";
import { dayParts, formatDay, formatDayShort, formatDayTick, formatWeekdayDay, isoDay, parseDay } from "../date";

// vite.config.ts runs the unit tests in Los Angeles, where UTC midnight is the
// evening before. A date read as UTC would show a day early in every case below.
describe("the test timezone", () => {
  it("is behind UTC, so a date read as UTC midnight would land on the day before", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/Los_Angeles");
    expect(new Date("2026-06-15").getDate()).toBe(14);
  });
});

describe("parseDay", () => {
  it("reads a date-only string as that calendar day", () => {
    const day = parseDay("2026-06-15");
    expect(day && isoDay(day)).toBe("2026-06-15");
  });

  it("reads the server's midnight date-time as the same day", () => {
    const day = parseDay("2026-06-15T00:00:00");
    expect(day && isoDay(day)).toBe("2026-06-15");
  });

  it("reads a year/month/day", () => {
    const day = parseDay("2026/5/8");
    expect(day && isoDay(day)).toBe("2026-05-08");
  });

  it("reads a moment with an offset as the viewer's day", () => {
    // 03:00 UTC on the 15th is 20:00 on the 14th in Los Angeles.
    const day = parseDay("2026-06-15T03:00:00Z");
    expect(day && isoDay(day)).toBe("2026-06-14");
  });

  it("is null for a missing, unreadable or impossible date", () => {
    expect(parseDay(null)).toBeNull();
    expect(parseDay(undefined)).toBeNull();
    expect(parseDay("")).toBeNull();
    expect(parseDay("not a date")).toBeNull();
    expect(parseDay("May 8")).toBeNull();
    expect(parseDay("2026-02-31")).toBeNull();
  });
});

describe("isoDay", () => {
  it("writes the local calendar day, not the UTC one", () => {
    // 20:00 on the 14th in Los Angeles is already the 15th in UTC.
    expect(isoDay(new Date(2026, 5, 14, 20))).toBe("2026-06-14");
  });
});

describe("formatWeekdayDay", () => {
  it("reads weekday · month day · year", () => {
    expect(formatWeekdayDay("2026-06-15")).toBe("Mon · Jun 15 · 2026");
    expect(formatWeekdayDay("2026-06-15T00:00:00")).toBe("Mon · Jun 15 · 2026");
  });

  it("drops the year when asked", () => {
    expect(formatWeekdayDay(new Date(2026, 5, 15, 9), { year: false })).toBe("Mon · Jun 15");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatWeekdayDay(null)).toBeNull();
    expect(formatWeekdayDay("not a date")).toBeNull();
    expect(formatWeekdayDay(new Date(Number.NaN))).toBeNull();
  });
});

describe("formatDayShort", () => {
  it("reads month day", () => {
    expect(formatDayShort("2026-06-15")).toBe("Jun 15");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatDayShort(null)).toBeNull();
    expect(formatDayShort("not a date")).toBeNull();
  });
});

describe("formatDay", () => {
  it("reads month day, year", () => {
    expect(formatDay("2026-06-15")).toBe("Jun 15, 2026");
    expect(formatDay("2026/5/25")).toBe("May 25, 2026");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatDay(null)).toBeNull();
    expect(formatDay("not a date")).toBeNull();
  });
});

describe("dayParts", () => {
  it("splits into calendar-tile parts", () => {
    expect(dayParts("2026-06-15")).toEqual({ month: "JUN", day: "15", year: "'26" });
  });

  it("is null for a missing or unparseable date", () => {
    expect(dayParts(null)).toBeNull();
    expect(dayParts("not a date")).toBeNull();
  });
});

describe("formatDayTick", () => {
  it("reads MM-DD", () => {
    expect(formatDayTick("2026-03-09")).toBe("03-09");
    expect(formatDayTick("2026-03-09T00:00:00")).toBe("03-09");
  });

  it("is null for a missing or unparseable date", () => {
    expect(formatDayTick(null)).toBeNull();
    expect(formatDayTick("Monday")).toBeNull();
  });
});
