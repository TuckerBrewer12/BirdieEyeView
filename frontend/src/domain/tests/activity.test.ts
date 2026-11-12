import { describe, expect, it } from "vitest";
import { activityMonth } from "../activity";

describe("activityMonth", () => {
  it("lays October 2026 out from a Thursday, with every day of the month", () => {
    const month = activityMonth([], 2026, 9);
    expect(month.leading).toBe(4);
    expect(month.days).toHaveLength(31);
    expect(month.days[0]).toMatchObject({ date: "2026-10-01", dayNum: 1, roundIds: [] });
    expect(month.days[30]).toMatchObject({ date: "2026-10-31", dayNum: 31 });
    expect(month.rounds).toBe(0);
  });

  it("knows a leap February", () => {
    expect(activityMonth([], 2028, 1).days).toHaveLength(29);
    expect(activityMonth([], 2026, 1).days).toHaveLength(28);
  });

  it("groups two rounds on the same local day, including ISO timestamps", () => {
    const month = activityMonth(
      [
        { id: "a", date: "2026-10-14T14:30:00Z" },
        { id: "b", date: "2026-10-14T08:00:00" },
        { id: "c", date: "2026-10-13" },
      ],
      2026,
      9,
    );
    expect(month.days.find((d) => d.date === "2026-10-14")?.roundIds).toEqual(["a", "b"]);
    expect(month.days.find((d) => d.date === "2026-10-13")?.roundIds).toEqual(["c"]);
    expect(month.rounds).toBe(3);
  });

  it("parses slash-separated dates and ignores rounds outside the month or without a date", () => {
    const month = activityMonth(
      [
        { id: "a", date: "2026/10/14" },
        { id: "b", date: "2026-02-01" },
        { id: "c", date: null },
      ],
      2026,
      9,
    );
    expect(month.days.find((d) => d.date === "2026-10-14")?.roundIds).toEqual(["a"]);
    expect(month.rounds).toBe(1);
  });
});
