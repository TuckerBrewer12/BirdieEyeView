import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { CAREER_LATER, CAREER_TODAY } from "@/testing/fixtures/career";
import type { AnalyticsDto } from "@/types/api";
import { careerFrom, eventDay, withinDays, type Milestone } from "../model";

const dto = sampleGolfer.analytics;
const achievements = dto.notable_achievements;

function withAchievements(changes: Partial<AnalyticsDto["notable_achievements"]>): AnalyticsDto {
  return { ...dto, notable_achievements: { ...achievements, ...changes } };
}

const labelOf = (m: Milestone) => ("threshold" in m ? `${m.kind}:${m.threshold}` : m.kind);

describe("careerFrom", () => {
  const career = careerFrom(dto, CAREER_TODAY);

  it("takes the headline figures from the server", () => {
    expect(career).toMatchObject({ roundCount: 24, holesPlayed: 432, handicapIndex: 7, windowDays: 365 });
  });

  it("pairs the handicap trend round by round with the server's differential status", () => {
    expect(career.handicapTrend).toHaveLength(dto.handicap_trend.length);
    expect(career.handicapTrend.at(-1)).toMatchObject({ handicapIndex: 7, differentialStatus: "counting" });
  });

  it("keeps only the radar axes the golfer has figures for", () => {
    expect(career.profile.map((entry) => entry.axis)).toEqual(["GIR", "Scrambling", "Putting", "Par 3s", "Par 4s", "Par 5s"]);
    expect(career.profile.every((entry) => entry.hasData)).toBe(true);
  });

  it("weights the score mix across every hole", () => {
    const shares = Object.values(career.scoreMix).reduce((sum, share) => sum + share, 0);
    expect(shares).toBeCloseTo(100, 0);
    expect(career.scoreMix.eagle).toBe(0);
  });

  it("lists each record with the round it was set in", () => {
    const lowest = career.windows.lifetime.records.find((record) => record.kind === "lowest-round");
    expect(lowest).toEqual({
      kind: "lowest-round",
      value: 75,
      event: {
        date: "2026/5/25",
        course: "Presidio Golf Course",
        roundId: achievements.scoring_records_events.lifetime.lowest_round!.round_id,
      },
    });
    expect(career.windows.one_year.records.map((record) => record.kind)).toEqual(
      career.windows.lifetime.records.map((record) => record.kind),
    );
  });

  it("counts pars and bogeys over a lifetime, triples and worse over the last year, as the server does", () => {
    const kinds = (w: "lifetime" | "one_year") => career.windows[w].totals.map((total) => total.kind);
    expect(kinds("lifetime")).toContain("pars");
    expect(kinds("lifetime")).not.toContain("triples");
    expect(kinds("one_year")).toContain("triples");
    expect(kinds("one_year")).not.toContain("pars");
  });

  it("reads a round under par after breaking 75 and before breaking 70", () => {
    const labels = career.windows.lifetime.scoring.map(labelOf);
    expect(labels.slice(labels.indexOf("score-break:75"), labels.indexOf("score-break:70") + 1)).toEqual([
      "score-break:75",
      "under-par",
      "score-break:70",
    ]);
    expect(labels.slice(-2)).toEqual(["first-eagle", "hole-in-one"]);
  });

  it("marks a score break reached, with the round it fell in", () => {
    const break80 = career.windows.lifetime.scoring.find((m) => labelOf(m) === "score-break:80");
    expect(break80).toMatchObject({ achieved: true, roundId: "024547fc-f399-501c-bb61-ea2dfe649c5d" });
    expect(career.windows.lifetime.scoring.find((m) => labelOf(m) === "score-break:75")?.achieved).toBe(false);
  });

  it("lists the last year's score milestones as the server's new personal records", () => {
    const year = career.windows.one_year;
    expect(year.newRecords).toBe(7);
    expect(year.scoring.map(labelOf)).toEqual([120, 110, 100, 95, 90, 85, 80].map((n) => `score-break:${n}`));
    expect(year.scoring.every((m) => m.achieved)).toBe(true);
  });

  it("reads the server's first-eagle and under-par records, and skips a key it doesn't know", () => {
    const eagle = { course: "Presidio Golf Course", date: "2026/5/1", round_id: "eagle-round" };
    const career = careerFrom(
      withAchievements({
        round_milestones: {
          lifetime: { ...achievements.round_milestones.lifetime, first_eagle: eagle },
          one_year: {
            new_personal_records_achieved: ["first_eagle", "first_round_under_par", "most_cats"],
            new_personal_records_achieved_count: 3,
          },
        },
      }),
      CAREER_TODAY,
    );
    expect(career.windows.one_year.scoring).toEqual([
      { kind: "first-eagle", achieved: true, roundId: "eagle-round" },
      { kind: "under-par", achieved: true, roundId: null },
    ]);
  });

  it("counts a putt or GIR break in the last year only when it was first reached in it", () => {
    const later = careerFrom(dto, CAREER_LATER);
    const reached = (c: typeof later, group: "putting" | "gir") =>
      c.windows.one_year[group].filter((m) => m.achieved).map(labelOf);

    expect(reached(career, "putting")).toHaveLength(6);
    // By April 2027 the March 2026 rounds have left the window; the May 2026 one hasn't.
    expect(reached(later, "putting")).toEqual([]);
    expect(reached(later, "gir")).toEqual(["gir-break:9"]);
    expect(later.windows.lifetime.gir.filter((m) => m.achieved)).toHaveLength(3);
  });
});

describe("eventDay", () => {
  it("reads the server's year/month/day as a UTC day", () => {
    expect(eventDay("2026/5/8")?.toISOString()).toBe("2026-05-08T00:00:00.000Z");
  });

  it("is null for a date it can't read", () => {
    expect(eventDay("May 8")).toBeNull();
  });
});

describe("withinDays", () => {
  const today = new Date("2026-06-02T18:00:00.000Z");
  const on = (date: string) => ({ date, course: "Presidio Golf Course", roundId: null });

  it("counts an event inside the window and not one before it", () => {
    expect(withinDays(on("2026/6/1"), 365, today)).toBe(true);
    expect(withinDays(on("2025/6/1"), 365, today)).toBe(false);
  });

  it("does not count a missing or unreadable event", () => {
    expect(withinDays(null, 365, today)).toBe(false);
    expect(withinDays(on("soon"), 365, today)).toBe(false);
  });
});
