import { describe, expect, it } from "vitest";
import { sampleCareer } from "@/testing/fixtures/career";
import {
  eventDetail,
  milestoneKey,
  milestoneLabel,
  newRecordsNote,
  profileAxes,
  recordValue,
  totalsTitle,
  windowLabel,
} from "../present";

describe("career present", () => {
  it("names the windows, with the server's span for the last year", () => {
    expect(windowLabel("lifetime", 365)).toBe("Lifetime");
    expect(windowLabel("one_year", 365)).toBe("Last 365 Days");
    expect(totalsTitle("lifetime")).toBe("Career Totals");
    expect(totalsTitle("one_year")).toBe("Year Totals");
  });

  it("words each kind of milestone", () => {
    const off = { achieved: false, roundId: null };
    expect(milestoneLabel({ kind: "score-break", threshold: 80, ...off })).toBe("Break 80");
    expect(milestoneLabel({ kind: "putt-break", threshold: 30, ...off })).toBe("Break 30 Putts");
    expect(milestoneLabel({ kind: "gir-break", threshold: 9, ...off })).toBe("9/18 GIR");
    expect(milestoneLabel({ kind: "under-par", ...off })).toBe("Round Under Par");
    expect(milestoneLabel({ kind: "first-eagle", ...off })).toBe("First Eagle");
    expect(milestoneLabel({ kind: "hole-in-one", ...off })).toBe("Hole-in-One");
  });

  it("keys a threshold milestone by its threshold", () => {
    expect(milestoneKey({ kind: "score-break", threshold: 80, achieved: true, roundId: null })).toBe("score-break-80");
    expect(milestoneKey({ kind: "first-eagle", achieved: false, roundId: null })).toBe("first-eagle");
  });

  it("says where and when a record was set", () => {
    expect(eventDetail({ date: "2026/5/25", course: "Presidio Golf Course", roundId: null })).toBe(
      "May 25, 2026 · Presidio Golf Course",
    );
    expect(eventDetail({ date: "someday", course: "Presidio Golf Course", roundId: null })).toBe(
      "someday · Presidio Golf Course",
    );
    expect(eventDetail(null)).toBeNull();
  });

  it("dashes a record no round has set", () => {
    expect(recordValue(75)).toBe("75");
    expect(recordValue(null)).toBe("—");
  });

  it("counts the year's new records", () => {
    expect(newRecordsNote(7, 365)).toBe("7 new personal records in the last 365 days.");
    expect(newRecordsNote(1, 365)).toBe("1 new personal record in the last 365 days.");
  });

  it("labels each radar spoke with the golfer's own figure", () => {
    const axes = profileAxes(sampleCareer.profile);
    expect(axes[0]).toEqual({ label: "GIR", value: 33.1, valueLabel: "33%" });
    expect(axes.every((axis) => axis.benchmark === undefined)).toBe(true);
  });
});
