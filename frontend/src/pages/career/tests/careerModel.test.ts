import { describe, expect, it } from "vitest";
import { sampleAnalyticsAYearOn } from "@/testing/fakes/analyticsResponses";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import type { AnalyticsDto } from "@/types/api";
import { careerFrom, type Milestone } from "../model";

const dto = sampleGolfer.analytics;
const achievements = dto.notable_achievements;

function withAchievements(changes: Partial<AnalyticsDto["notable_achievements"]>): AnalyticsDto {
  return { ...dto, notable_achievements: { ...achievements, ...changes } };
}

const labelOf = (m: Milestone) => ("threshold" in m ? `${m.kind}:${m.threshold}` : m.kind);

describe("careerFrom", () => {
  const career = careerFrom(dto);

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

  it("takes the score mix across every hole from the server", () => {
    expect(career.scoreMix).toEqual(dto.score_mix);
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

  it("lists the last year's score milestones the server says were first reached in it", () => {
    const year = career.windows.one_year;
    expect(year.newRecords).toBe(7);
    expect(year.scoring.map(labelOf)).toEqual([120, 110, 100, 95, 90, 85, 80].map((n) => `score-break:${n}`));
    expect(year.scoring.every((m) => m.achieved)).toBe(true);
  });

  it("counts the first eagle and a round under par in the last year when the server says they fell in it", () => {
    const lifetime = achievements.round_milestones.lifetime;
    const event = { course: "Presidio Golf Course", date: "2026/5/1", round_id: "eagle-round" };
    const career = careerFrom(
      withAchievements({
        round_milestones: {
          ...achievements.round_milestones,
          lifetime: {
            ...lifetime,
            score_breaks: lifetime.score_breaks.map((row) => ({ ...row, achievement: null })),
            first_eagle: { ...event, in_window: true },
            first_round_under_par: { ...event, round_id: "under-par-round", score: 71, in_window: true },
            first_hole_in_one: { ...event, round_id: "ace-round", in_window: false },
          },
        },
      }),
    );
    expect(career.windows.one_year.scoring).toEqual([
      { kind: "under-par", achieved: true, roundId: "under-par-round" },
      { kind: "first-eagle", achieved: true, roundId: "eagle-round" },
    ]);
    expect(career.windows.lifetime.scoring.find((m) => m.kind === "hole-in-one")).toEqual({
      kind: "hole-in-one",
      achieved: true,
      roundId: "ace-round",
    });
  });

  it("counts a putt or GIR break in the last year only when the server says it was first reached in it", () => {
    const later = careerFrom(sampleAnalyticsAYearOn);
    const reached = (c: typeof later, group: "putting" | "gir") =>
      c.windows.one_year[group].filter((m) => m.achieved).map(labelOf);

    expect(reached(career, "putting")).toHaveLength(6);
    expect(reached(later, "putting")).toEqual([]);
    expect(reached(later, "gir")).toEqual(["gir-break:9"]);
    expect(later.windows.lifetime.gir.filter((m) => m.achieved)).toHaveLength(3);
    expect(later.windows.one_year.scoring.map(labelOf)).toEqual(["score-break:80"]);
    expect(later.windows.one_year.newRecords).toBe(1);
  });
});
