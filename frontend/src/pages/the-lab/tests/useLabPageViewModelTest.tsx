import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { benchmarkShapeFrom } from "@/domain";
import { FakeLabRepository, type FakeLabSeed } from "@/testing/fakes/FakeLabRepository";
import { avery, jordan, populatedFriendships } from "@/testing/fixtures/friendships";
import {
  averyLabAnalytics,
  breaks90Shape,
  labAnalyticsByGolfer,
  labBenchmarks,
  labGoalReport,
} from "@/testing/fixtures/lab";
import { LAB_FILTERS } from "../model";
import { useLabPageViewModel } from "../useLabPageViewModel";

const POPULATED: FakeLabSeed = {
  analytics: labAnalyticsByGolfer,
  goalReport: labGoalReport,
  friends: { friendships: populatedFriendships },
  benchmarks: labBenchmarks,
};

function setup(seed: FakeLabSeed = POPULATED) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const repository = new FakeLabRepository(seed);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useLabPageViewModel("user-1", repository), { wrapper });
  return { client, repository, result };
}

async function loaded(seed?: FakeLabSeed) {
  const view = setup(seed);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  await waitFor(() => expect(view.result.current.goal?.average).not.toBeNull());
  return view;
}

describe("useLabPageViewModel", () => {
  it("stands the goal on the server's report, savers in its order and words", async () => {
    const { result } = await loaded();

    expect(result.current.goal).toMatchObject({
      target: 89,
      average: 91.7,
      gap: 2.7,
      progressPct: 64,
      onTrack: false,
      bestScore: 89,
    });
    expect(result.current.goal?.savers.map((s) => s.kind)).toEqual([
      "three_putt_bleed",
      "blowup_holes",
      "gir_opportunity",
    ]);
    expect(result.current.goal?.savers[0].headline).toBe(labGoalReport.savers[0].headline);
  });

  it("has no goal, and asks for no report, until one is set", async () => {
    const { repository, result } = setup({ ...POPULATED, user: { scoring_goal: null } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.goal).toBeNull();
    expect(result.current.peak).toBeNull();
    expect(result.current.roundsMeetingGoal).toBeNull();
    expect(result.current.bestScore).toBe(89);
    expect(repository.analyticsRequests).toEqual(["user-1"]);
  });

  it("sets a goal through the profile, and the goal follows the saved user", async () => {
    const { repository, result } = await loaded();
    expect(repository.goalReportRequests).toBe(1);

    act(() => result.current.setGoal(84));
    await waitFor(() => expect(result.current.goal?.target).toBe(84));

    expect(repository.updates).toEqual([{ scoring_goal: 84 }]);
    await waitFor(() => expect(result.current.goal?.average).not.toBeNull());
    expect(repository.goalReportRequests).toBeGreaterThanOrEqual(2);
  });

  it("never shows the last goal's figures against a new goal", async () => {
    const { repository, result } = await loaded();
    expect(result.current.roundsMeetingGoal).toBe(1);
    repository.holdGoalReport();

    act(() => result.current.setGoal(84));
    await waitFor(() => expect(result.current.goal?.target).toBe(84));

    expect(result.current.roundsMeetingGoal).toBeNull();
    expect(result.current.goal?.gap).toBeNull();
    expect(result.current.peak?.gapToGoal).toBeNull();

    repository.finishGoalReport();
    await waitFor(() => expect(result.current.roundsMeetingGoal).toBe(1));
  });

  it("keeps the old goal and reports the error when the save fails", async () => {
    const { repository, result } = await loaded();
    repository.saveError = new Error("Forbidden");

    act(() => result.current.setGoal(79));
    await waitFor(() => expect(result.current.goalSaveError?.message).toBe("Forbidden"));

    expect(result.current.goal?.target).toBe(89);
  });

  it("takes the attempts, best rounds, trend and putting from the server's figures", async () => {
    const { result } = await loaded();

    expect(result.current.attempts).toHaveLength(12);
    expect(result.current.attempts.filter((a) => a.metGoal).map((a) => a.score)).toEqual([89]);
    expect(result.current.roundsMeetingGoal).toBe(1);
    expect(result.current.recentTrend).toBe(0.5);
    expect(result.current.peak).toEqual({
      rounds: [
        { roundId: "lab-6", courseName: "Half Moon Bay", score: 89 },
        { roundId: "lab-5", courseName: "Pebble Creek", score: 90 },
        { roundId: "lab-11", courseName: "Muni", score: 90 },
      ],
      average: 89.7,
      overallAverage: 91.7,
      gapToGoal: 0.7,
      meetsGoal: false,
    });
    expect(result.current.peakImpacts.map((i) => [i.kind, i.strokes])).toEqual([
      ["birdies", 0.58],
      ["bogeys", 1.17],
      ["doubles", 0.83],
    ]);
    expect(result.current.putting).toMatchObject({ threePuttsPerRound: 2, threePuttRate: 11.1, puttsPerRound: 34.5 });
  });

  it("draws the shape alone, then against a handicap benchmark", async () => {
    const { repository, result } = await loaded();

    expect(result.current.benchmark).toBeNull();
    expect(result.current.radar.map((e) => e.axis)).toEqual([
      "GIR",
      "Scrambling",
      "Putting",
      "Par 3s",
      "Par 4s",
      "Par 5s",
    ]);
    expect(result.current.parTypes.every((row) => row.benchmarkToPar == null)).toBe(true);
    expect(repository.benchmarkRequests).toEqual([]);

    act(() => result.current.setComparison(5));
    await waitFor(() => expect(result.current.benchmark).not.toBeNull());
    expect(result.current.benchmark).toEqual(benchmarkShapeFrom(labBenchmarks["handicap:5"].benchmark!));
    expect(result.current.parTypes.map((row) => [row.benchmarkToPar, row.gap, row.verdict])).toEqual([
      [0.2, 0.72, "behind"],
      [0.5, 0.62, "behind"],
      [0.55, 0.3, "behind"],
    ]);
    expect(repository.benchmarkRequests).toEqual(["handicap:5"]);
  });

  it("compares with the first friend, and loads the one picked", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setComparison("friend"));
    expect(result.current.friends.map((f) => f.name)).toEqual([avery.name, jordan.name]);
    expect(result.current.selectedFriend?.id).toBe(avery.id);
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));
    expect(result.current.benchmark?.girPct).toBe(44);

    act(() => result.current.selectFriend(jordan.id));
    await waitFor(() => expect(result.current.friendComparison).toBe("no-rounds"));
    expect(result.current.benchmark).toBeNull();
    expect(repository.benchmarkRequests).toEqual([`friend:${avery.id}`, `friend:${jordan.id}`]);
    expect(repository.analyticsRequests).toEqual(["user-1"]);
  });

  it("says so when there are no friends to compare with", async () => {
    const { result } = await loaded({ ...POPULATED, friends: {} });

    act(() => result.current.setComparison("friend"));

    expect(result.current.friendComparison).toBe("no-friends");
    expect(result.current.benchmark).toBeNull();
  });

  it("switches to the peak game, drawn against the nearest goal's shape", async () => {
    const { result } = await loaded();

    act(() => result.current.setRadarMode("peak"));

    expect(result.current.radarMode).toBe("peak");
    await waitFor(() => expect(result.current.benchmark).toEqual(benchmarkShapeFrom(breaks90Shape)));
  });

  it("stays on the average when there is no peak game to show", async () => {
    const { result } = setup({ ...POPULATED, user: { scoring_goal: null } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setRadarMode("peak"));

    expect(result.current.radarMode).toBe("benchmark");
  });

  it("reads the last 20 rounds through the shared analytics query", async () => {
    const { client, repository } = await loaded();

    expect(repository.analyticsFilters).toEqual([LAB_FILTERS]);
    expect(client.getQueryData(queryKeys.analytics("user-1", LAB_FILTERS))).toBe(labAnalyticsByGolfer["user-1"]);
  });

  it("caches each comparison under the golfer's analytics, so a new round refreshes it", async () => {
    const { client, repository, result } = await loaded();

    act(() => result.current.setComparison("friend"));
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));
    act(() => result.current.setComparison(5));
    await waitFor(() => expect(result.current.benchmark?.scramblingPct).toBe(41));
    act(() => result.current.setComparison("friend"));

    expect(result.current.friendComparison).toBe("ready");
    expect(repository.benchmarkRequests.slice(0, 2)).toEqual([`friend:${avery.id}`, "handicap:5"]);
    const cached = client.getQueryCache().findAll({ queryKey: queryKeys.analytics("user-1") });
    expect(cached.map((query) => query.queryKey[2])).toEqual(expect.arrayContaining([LAB_FILTERS, "benchmark"]));
  });

  it("never shows one friend's shape while the next friend's loads", async () => {
    const { repository, result } = await loaded();
    act(() => result.current.setComparison("friend"));
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));

    repository.benchmarks[`friend:${jordan.id}`] = labBenchmarks[`friend:${avery.id}`];
    repository.holdBenchmark();
    act(() => result.current.selectFriend(jordan.id));

    expect(result.current.friendComparison).toBe("loading");
    expect(result.current.benchmark).toBeNull();
    repository.finishBenchmark();
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));
  });

  it("opens the phone on the first panel, and switches between those with something to show", async () => {
    const { result } = await loaded();

    expect(result.current.panels).toEqual(["by-par", "putting", "peak"]);
    expect(result.current.panel).toBe("by-par");

    act(() => result.current.setPanel("peak"));
    expect(result.current.panel).toBe("peak");

    act(() => result.current.setPanel("putting"));
    expect(result.current.panel).toBe("putting");
  });

  it("has no Peak panel without a goal, and stays on a panel that has something to show", async () => {
    const { result } = setup({ ...POPULATED, user: { scoring_goal: null } });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPanel("peak"));

    expect(result.current.panels).toEqual(["by-par", "putting"]);
    expect(result.current.panel).toBe("by-par");
  });

  it("offers only the panels with something in them", async () => {
    const { result } = setup({
      ...POPULATED,
      user: { scoring_goal: null },
      analytics: { "user-1": averyLabAnalytics },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.panels).toEqual(["by-par"]);
    expect(result.current.panel).toBe("by-par");
  });

  it("reports a failed load and retries it", async () => {
    const { repository, result } = setup({ ...POPULATED, analytics: {} });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analytics).toBeNull();
    expect(result.current.error?.message).toBe("Analytics failed to load.");

    repository.analytics["user-1"] = labAnalyticsByGolfer["user-1"];
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.analytics).not.toBeNull());
  });
});
