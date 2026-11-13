import { describe, expect, it } from "vitest";
import { friendshipFromDto } from "@/data/friendsModel";
import { populatedFriendships } from "@/testing/fixtures/friendships";
import { labAnalytics, labGoalReport } from "@/testing/fixtures/lab";
import { friendOptionsFrom, goalStandingFrom, peakGameFrom, profileAnalyticsFrom } from "../profileModel";
import {
  comparisonFromKey,
  comparisonKey,
  comparisonName,
  comparisonOptions,
  goalFigures,
  peakNote,
  peakRow,
  saverShareLabel,
  standingGroups,
  saversHeading,
  saverStrokes,
} from "../profilePresent";

describe("goalStandingFrom", () => {
  it("is null with no goal", () => {
    expect(goalStandingFrom(null, labGoalReport)).toBeNull();
  });

  it("stands the goal with no figures before the report loads", () => {
    expect(goalStandingFrom(79, null)).toEqual({
      target: 79,
      average: null,
      gap: null,
      progressPct: null,
      onTrack: false,
      lowestScore: null,
      attempts: [],
      savers: [],
    });
  });

  it("shows the analytics' lowest round as Best until the report has its own", () => {
    expect(goalStandingFrom(79, null, 86)?.lowestScore).toBe(86);
    expect(goalStandingFrom(89, labGoalReport, 70)?.lowestScore).toBe(labGoalReport.lowest_score);
  });

  it("keeps the last twelve scores and the three biggest savings", () => {
    const attempts = Array.from({ length: 15 }, (_, i) => ({ round_id: `r${i}`, score: 80 + i, met_goal: false }));
    const savers = [...labGoalReport.savers, ...labGoalReport.savers];
    const goal = goalStandingFrom(89, { ...labGoalReport, attempts, savers })!;
    expect(goal.attempts.map((attempt) => attempt.score)).toEqual(attempts.slice(-12).map((attempt) => attempt.score));
    expect(goal.savers.map((saver) => saver.kind)).toEqual(labGoalReport.savers.slice(0, 3).map((saver) => saver.type));
  });

  it("keeps the server's savers as they came", () => {
    const savers = goalStandingFrom(89, labGoalReport)!.savers;
    expect(savers[1]).toEqual({
      kind: "blowup_holes",
      strokesSaved: 0.9,
      shareOfGap: 33,
      headline: labGoalReport.savers[1].headline,
      detail: labGoalReport.savers[1].detail,
    });
  });
});

describe("friendOptionsFrom", () => {
  it("lists accepted friends once each, by name", () => {
    const friendships = populatedFriendships.map((dto) => friendshipFromDto(dto, "user-1"));
    const twice = [...friendships, ...friendships];
    expect(friendOptionsFrom(twice).map((f) => f.name)).toEqual(["Avery Lin", "Jordan Castellanos"]);
  });
});

describe("the server's figures", () => {
  it("maps the server's peak game, with the goal report's gap, once a goal is set", () => {
    expect(peakGameFrom(labAnalytics, null, labGoalReport)).toBeNull();
    expect(peakGameFrom({ ...labAnalytics, peak_game: null }, 89, labGoalReport)).toBeNull();

    const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
    expect(peak.rounds[0]).toEqual({ roundId: "lab-6", courseName: "Half Moon Bay", score: 89 });
    expect(peak.average).toBe(89.7);
    expect(peak.gapToGoal).toBe(0.7);
    // Before the goal's report loads, the peak stands without a gap.
    expect(peakGameFrom(labAnalytics, 89, null)?.gapToGoal).toBeNull();
  });

  it("falls back to the window's lowest score from the server's records", () => {
    expect(profileAnalyticsFrom(labAnalytics).lowestScore).toBe(89);
    expect(profileAnalyticsFrom(labAnalytics).next_level_handicap).toBe(15);
  });
});

describe("profilePresent", () => {
  const avery = { id: "user-avery", name: "Avery Lin" };

  it("round-trips a comparison through its menu key", () => {
    expect(comparisonFromKey(comparisonKey(15, null))).toEqual({ value: 15, friendId: null });
    expect(comparisonFromKey(comparisonKey("friend", avery))).toEqual({ value: "friend", friendId: "user-avery" });
    expect(comparisonFromKey("handicap:7")).toBeNull();
    expect(comparisonOptions([avery]).map((option) => option.label)).toEqual([
      "Scratch",
      "5 handicap",
      "10 handicap",
      "15 handicap",
      "20 handicap",
      "25 handicap",
      "Avery Lin",
    ]);
  });

  it("names what the golfer is compared with", () => {
    expect(comparisonName("friend", avery)).toBe("Avery Lin");
    expect(comparisonName(0, null)).toBe("Scratch");
    expect(comparisonName(null, null)).toBeNull();
  });

  it("words the goal's figures and the strokes to find", () => {
    const goal = goalStandingFrom(89, labGoalReport)!;
    expect(goalFigures(goal)).toEqual([
      { label: "Average", value: "91.7", tone: "neutral" },
      { label: "Best", value: "89", tone: "good" },
      { label: "To go", value: "2.7", tone: "bad" },
    ]);
    // Met is the server's call: on track, the gap reads as how far under.
    expect(goalFigures({ ...goal, gap: -1.2, onTrack: true })[2]).toEqual({ label: "Under by", value: "1.2", tone: "good" });
    expect(saversHeading(goal)).toBe("Where to find 2.7 strokes");
    expect(saversHeading({ ...goal, gap: 0, onTrack: true })).toBeNull();
    expect(saverShareLabel(goal.savers[1])).toBe(`${goal.savers[1].headline}: 33% of the gap`);
    expect(saverStrokes(goal.savers[0])).toMatch(/^\u2212/);
  });

  it("words the peak game against the goal", () => {
    const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
    expect(peakNote(peak, 89)).toEqual({ lead: "best 3 · ", verdict: "0.7 off 90", tone: "bad" });
    expect(peakNote({ ...peak, meetsGoal: true }, 89)).toEqual({ lead: "best 3 · ", verdict: "breaks 90", tone: "good" });
    expect(peakNote({ ...peak, meetsGoal: null }, 89)).toEqual({ lead: "best 3", verdict: null, tone: "neutral" });
    expect(peakRow(labAnalytics.peak_game!.impacts[1])).toEqual({ label: "Bogeys", peak: "8.0", average: "9.2", gained: "+1.2" });
  });

  it("gives each axis ahead or behind in its own terms, biggest gap first, with no radar points", () => {
    const groups = standingGroups({
      ahead: [{ axis: "GIR", mine: "33%", theirs: "24%", points: 9 }],
      behind: [
        { axis: "Par 3s", mine: "+0.6", theirs: "+0.2", points: -16 },
        { axis: "Putting", mine: "2.02/GIR", theirs: "1.94/GIR", points: -4 },
      ],
      judged: 3,
    });
    expect(groups).toEqual([
      { title: "Ahead", tone: "good", rows: [{ axis: "GIR", mine: "33%", against: "vs 24%" }] },
      {
        title: "Behind",
        tone: "bad",
        rows: [
          { axis: "Par 3s", mine: "+0.6", against: "vs +0.2" },
          { axis: "Putting", mine: "2.02/GIR", against: "vs 1.94/GIR" },
        ],
      },
    ]);
  });
});
