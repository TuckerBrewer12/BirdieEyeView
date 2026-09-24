import { describe, expect, it } from "vitest";
import { activityDays } from "../activity";

/** Monday 15 Jun 2026 — window is Sun 17 May through Sat 20 Jun. */
const TODAY = new Date(2026, 5, 15, 12);

describe("activityDays", () => {
  it("is a 5-week grid ending on this week's Saturday", () => {
    const days = activityDays([], TODAY);
    expect(days).toHaveLength(35);
    expect(days[0]).toMatchObject({ date: "2026-05-17", dayNum: 17, count: 0, inFuture: false });
    expect(days[days.length - 1]).toMatchObject({
      date: "2026-06-20",
      dayNum: 20,
      count: 0,
      inFuture: true,
    });
  });

  it("counts two rounds on the same local day, including ISO timestamps", () => {
    const days = activityDays(
      [
        { date: "2026-06-14T14:30:00Z" },
        { date: "2026-06-14T08:00:00" },
        { date: "2026-06-13" },
      ],
      TODAY,
    );
    expect(days.find((d) => d.date === "2026-06-14")?.count).toBe(2);
    expect(days.find((d) => d.date === "2026-06-13")?.count).toBe(1);
  });

  it("parses slash-separated dates and ignores rounds outside the window", () => {
    const days = activityDays(
      [{ date: "2026/06/14" }, { date: "2026-02-01" }, { date: null }],
      TODAY,
    );
    expect(days.find((d) => d.date === "2026-06-14")?.count).toBe(1);
    expect(days.every((d) => d.date !== "2026-02-01")).toBe(true);
  });

  it("marks days after today as future", () => {
    const days = activityDays([], TODAY);
    expect(days.filter((d) => d.date <= "2026-06-15").every((d) => !d.inFuture)).toBe(true);
    expect(days.filter((d) => d.date > "2026-06-15").every((d) => d.inFuture)).toBe(true);
  });
});
