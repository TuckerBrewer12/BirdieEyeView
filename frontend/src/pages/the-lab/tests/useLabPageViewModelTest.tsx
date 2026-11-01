import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { HANDICAP_BENCHMARK, nearestGoalBenchmark } from "@/domain";
import { FakeLabRepository, type FakeLabSeed } from "@/testing/fakes/FakeLabRepository";
import { avery, jordan, populatedFriendships } from "@/testing/fixtures/friendships";
import { averyLabAnalytics, labAnalyticsByGolfer, labGoalReport } from "@/testing/fixtures/lab";
import { LAB_FILTERS } from "../model";
import { useLabPageViewModel } from "../useLabPageViewModel";

const POPULATED: FakeLabSeed = {
  analytics: labAnalyticsByGolfer,
  goalReport: labGoalReport,
  friends: { friendships: populatedFriendships },
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
    expect(result.current.roundsMeetingGoal).toBe(0);
    // The best score falls back to the window's lowest.
    expect(result.current.bestScore).toBe(89);
    expect(repository.analyticsRequests).toEqual(["user-1"]);
  });

  it("sets a goal through the profile, and the goal follows the saved user", async () => {
    const { repository, result } = await loaded();
    expect(repository.goalReportRequests).toBe(1);

    act(() => result.current.setGoal(84));
    await waitFor(() => expect(result.current.goal?.target).toBe(84));

    expect(repository.updates).toEqual([{ scoring_goal: 84 }]);
    // The report is for the old goal, so it is asked for again.
    await waitFor(() => expect(repository.goalReportRequests).toBe(2));
  });

  it("keeps the old goal and reports the error when the save fails", async () => {
    const { repository, result } = await loaded();
    repository.saveError = new Error("Forbidden");

    act(() => result.current.setGoal(79));
    await waitFor(() => expect(result.current.goalSaveError?.message).toBe("Forbidden"));

    expect(result.current.goal?.target).toBe(89);
  });

  it("shapes the attempts, best rounds and trend from the last 20 rounds", async () => {
    const { result } = await loaded();

    expect(result.current.attempts).toHaveLength(12);
    expect(result.current.roundsMeetingGoal).toBe(1);
    expect(result.current.recentTrend).toBe(0.5);
    expect(result.current.peak?.rounds.map((r) => r.score)).toEqual([89, 90, 90]);
    expect(result.current.peak?.gapToGoal).toBeCloseTo(0.67, 2);
    expect(result.current.peakImpacts.map((i) => i.kind)).toEqual(["birdies", "bogeys", "doubles"]);
  });

  it("draws the shape alone, then against a handicap benchmark", async () => {
    const { result } = await loaded();

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

    act(() => result.current.setComparison(5));
    expect(result.current.benchmark).toEqual(HANDICAP_BENCHMARK[5]);
    expect(result.current.parTypes[0].benchmarkToPar).not.toBeNull();
  });

  it("compares with the first friend, and loads the one picked", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setComparison("friend"));
    expect(result.current.friends.map((f) => f.name)).toEqual([avery.name, jordan.name]);
    expect(result.current.selectedFriend?.id).toBe(avery.id);
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));
    expect(result.current.benchmark?.gir).toBe(44);

    act(() => result.current.selectFriend(jordan.id));
    await waitFor(() => expect(result.current.friendComparison).toBe("no-rounds"));
    expect(result.current.benchmark).toBeNull();
    expect(repository.analyticsRequests).toEqual(["user-1", avery.id, jordan.id]);
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
    expect(result.current.benchmark).toEqual(nearestGoalBenchmark(result.current.peak!.average));
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
    // The same entry the Analytics page reads for these filters, so neither fetches it twice.
    expect(client.getQueryData(queryKeys.analytics("user-1", LAB_FILTERS))).toBe(labAnalyticsByGolfer["user-1"]);
  });

  it("asks a friend's analytics for the same 20 rounds, cached under the friend", async () => {
    const { client, repository, result } = await loaded();

    act(() => result.current.setComparison("friend"));
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));

    expect(repository.analyticsFilters).toEqual([LAB_FILTERS, LAB_FILTERS]);
    expect(client.getQueryData(queryKeys.analytics(avery.id, LAB_FILTERS))).toBe(labAnalyticsByGolfer[avery.id]);
  });

  it("never shows one friend's shape while the next friend's loads", async () => {
    const { repository, result } = await loaded();
    act(() => result.current.setComparison("friend"));
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));

    repository.analytics[jordan.id] = labAnalyticsByGolfer[avery.id];
    repository.holdAnalytics();
    act(() => result.current.selectFriend(jordan.id));

    expect(result.current.friendComparison).toBe("loading");
    expect(result.current.benchmark).toBeNull();
    repository.finishAnalytics();
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

    // These rounds have par types but no putts logged.
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
