import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { FakeAnalyticsRepository, type FakeAnalyticsSeed } from "@/testing/fakes/FakeAnalyticsRepository";
import { avery, jordan, populatedFriendships } from "@/testing/fixtures/friendships";
import { labAnalytics, labBenchmarks, labGoalReport, labUser } from "@/testing/fixtures/lab";
import { PROFILE_FILTERS, profileAnalyticsFrom } from "../profileModel";
import { useProfileViewModel } from "../useProfileViewModel";

/** The Lab's golfer, out to break 90, with friends and the server's comparisons. */
const labGolfer: FakeAnalyticsSeed = {
  analytics: labAnalytics,
  profileAnalytics: labAnalytics,
  user: labUser,
  goalReport: labGoalReport,
  friends: { friendships: populatedFriendships },
  benchmarks: labBenchmarks,
};

/** The profile view model, closed until `open()`, as the page holds it until Profile's tab opens. */
function setup(
  seed: FakeAnalyticsSeed = labGolfer,
  configure?: (repository: FakeAnalyticsRepository) => void,
  initialFriendId: string | null = null,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const repository = new FakeAnalyticsRepository(seed);
  configure?.(repository);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => {
      const [active, setActive] = useState(false);
      return { ...useProfileViewModel(labUser.id, active, repository, initialFriendId), open: () => setActive(true) };
    },
    { wrapper },
  );
  return { repository, result, open: () => act(() => result.current.open()) };
}

/** Opened, with the profile loaded. */
async function loaded(seed?: FakeAnalyticsSeed, configure?: (repository: FakeAnalyticsRepository) => void) {
  const view = setup(seed, configure);
  view.open();
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

/** The golfer with their profile, goal report and default comparison loaded. */
async function profileLoaded(seed: FakeAnalyticsSeed = labGolfer) {
  const view = await loaded(seed);
  await waitFor(() => expect(view.result.current.goal?.average).not.toBeNull());
  return view;
}

describe("useProfileViewModel", () => {
  it("reads nothing until it opens, then the last 20 rounds at every course", async () => {
    const { repository, result, open } = setup();
    expect(result.current.loading).toBe(true);
    expect(repository.requests).toEqual([]);

    open();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(repository.requests).toEqual([PROFILE_FILTERS]);
    // The shape and the peak game are the window's: the server's own peak average, six axes drawn.
    expect(result.current.peak?.average).toBe(labAnalytics.peak_game?.average);
    expect(result.current.radar.length).toBeGreaterThan(0);
  });

  it("stands the goal on the server's report, savers in its order and words", async () => {
    const { result } = await profileLoaded();

    expect(result.current.goal).toMatchObject({ target: 89, average: 91.7, gap: 2.7, lowestScore: 89 });
    expect(result.current.goal?.savers.map((s) => s.kind)).toEqual([
      "three_putt_bleed",
      "blowup_holes",
      "gir_opportunity",
    ]);
  });

  it("has no goal, and asks for no report, until one is set", async () => {
    const { repository, result } = await loaded({ ...labGolfer, user: { ...labUser, scoring_goal: null } });

    expect(result.current.goal).toBeNull();
    expect(result.current.peak).toBeNull();
    expect(repository.goalReportRequests).toBe(0);
  });

  it("shows the window's lowest round as Best before the goal's report comes", async () => {
    const { result } = await loaded(labGolfer, (repository) => repository.holdGoalReport());

    expect(result.current.goal?.average).toBeNull();
    expect(result.current.goal?.lowestScore).toBe(profileAnalyticsFrom(labAnalytics).lowestScore);
  });

  it("saves a goal picked, and keeps the old one when the save fails", async () => {
    const { repository, result } = await profileLoaded();

    act(() => result.current.setGoal(84));
    await waitFor(() => expect(result.current.goal?.target).toBe(84));
    expect(repository.updates).toEqual([{ scoring_goal: 84 }]);

    repository.saveError = new Error("Forbidden");
    act(() => result.current.setGoal(79));
    await waitFor(() => expect(result.current.goalSaveError).toBe("Forbidden"));
    expect(result.current.goal?.target).toBe(84);
  });

  it("never shows the last goal's figures against a newly picked goal", async () => {
    const { repository, result } = await profileLoaded();
    expect(result.current.goal?.attempts.length).toBeGreaterThan(0);
    repository.holdGoalReport();

    act(() => result.current.setGoal(84));
    await waitFor(() => expect(result.current.goal?.target).toBe(84));
    // The new goal's report is still on its way: no figures, rather than the last goal's.
    expect(result.current.goal?.gap).toBeNull();
    expect(result.current.goal?.attempts).toEqual([]);
    expect(result.current.peak?.gapToGoal).toBeNull();

    act(() => repository.finishGoalReport());
    await waitFor(() => expect(result.current.goal?.gap).not.toBeNull());
  });

  it("holds the shape up against the next level from the golfer's index until they pick another", async () => {
    const { repository, result } = await profileLoaded();

    // A 17.8 is compared with a 15 handicap.
    expect(result.current.comparison).toBe(15);
    await waitFor(() => expect(result.current.compared).toBe(true));
    expect(repository.benchmarkRequests[0]).toBe("handicap:15");
    expect(result.current.standing.judged).toBe(6);

    act(() => result.current.pickComparison(5, null));
    await waitFor(() => expect(repository.benchmarkRequests).toContain("handicap:5"));
    expect(result.current.comparison).toBe(5);
    // Behind a 5 on every axis.
    await waitFor(() => expect(result.current.standing.ahead).toEqual([]));
  });

  it("starts against the friend it was opened for, as Social's Compare opens it", async () => {
    const view = setup(labGolfer, undefined, jordan.id);
    view.open();
    await waitFor(() => expect(view.result.current.selectedFriend?.id).toBe(jordan.id));
    expect(view.result.current.comparison).toBe("friend");
  });

  it("compares with a friend picked, and says when one has too few rounds", async () => {
    const { repository, result } = await profileLoaded();

    act(() => result.current.pickComparison("friend", avery.id));
    expect(result.current.friends.map((f) => f.name)).toEqual([avery.name, jordan.name]);
    await waitFor(() => expect(result.current.friendComparison).toBe("ready"));

    act(() => result.current.pickComparison("friend", jordan.id));
    await waitFor(() => expect(result.current.friendComparison).toBe("no-rounds"));
    expect(result.current.compared).toBe(false);
    expect(repository.benchmarkRequests).toContain(`friend:${jordan.id}`);
  });

  it("hands over the peak game and what its rounds did differently once a goal is set", async () => {
    const { result } = await profileLoaded();

    expect(result.current.peak?.average).toBe(labAnalytics.peak_game?.average);
    expect(result.current.peakImpacts.map((impact) => impact.kind)).toEqual(["birdies", "bogeys", "doubles"]);
  });

  it("has no peak game without a goal", async () => {
    const { result } = await loaded({ ...labGolfer, user: { ...labUser, scoring_goal: null } });

    expect(result.current.peak).toBeNull();
    expect(result.current.peakImpacts).toEqual([]);
  });
});
