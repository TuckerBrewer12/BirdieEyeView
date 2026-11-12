import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { benchmarkShapeFrom } from "@/domain";
import { FakeAnalyticsRepository, type FakeAnalyticsSeed } from "@/testing/fakes/FakeAnalyticsRepository";
import { avery, jordan, populatedFriendships } from "@/testing/fixtures/friendships";
import { breaks90Shape, labAnalytics, labBenchmarks, labGoalReport, labUser } from "@/testing/fixtures/lab";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { DEFAULT_FILTERS, type AnalyticsTab } from "../model";
import { PROFILE_FILTERS } from "../profileModel";
import { useAnalyticsPageViewModel } from "../useAnalyticsPageViewModel";

const USER_ID = sampleGolfer.profile.id;
const LINKS = sampleGolfer.playedCourses.find((course) => course.name === "Half Moon Bay Golf Links")!;
const PRESIDIO = sampleGolfer.playedCourses.find((course) => course.name === "Presidio Golf Course")!;

const golfer: FakeAnalyticsSeed = {
  analytics: sampleGolfer.analytics,
  analyticsByCourse: sampleGolfer.analyticsByCourse,
  playedCourses: sampleGolfer.playedCourses,
  user: sampleGolfer.profile,
};

/** The Lab's golfer, out to break 90, with friends and the server's comparisons. */
const labGolfer: FakeAnalyticsSeed = {
  analytics: labAnalytics,
  profileAnalytics: labAnalytics,
  user: labUser,
  goalReport: labGoalReport,
  friends: { friendships: populatedFriendships },
  benchmarks: labBenchmarks,
};

function setup(seed: FakeAnalyticsSeed = golfer, configure?: (repository: FakeAnalyticsRepository) => void, tab?: AnalyticsTab) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const repository = new FakeAnalyticsRepository(seed);
  configure?.(repository);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const userId = seed.user?.id ?? USER_ID;
  const { result } = renderHook(() => useAnalyticsPageViewModel(userId, tab, repository), { wrapper });
  return { client, repository, result };
}

async function loaded(seed?: FakeAnalyticsSeed, configure?: (repository: FakeAnalyticsRepository) => void) {
  const view = setup(seed, configure);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

/** The Lab's golfer with their profile, goal report and default comparison loaded. */
async function profileLoaded(seed: FakeAnalyticsSeed = labGolfer) {
  const view = await loaded(seed);
  act(() => view.result.current.setTab("profile"));
  await waitFor(() => expect(view.result.current.profile.loading).toBe(false));
  await waitFor(() => expect(view.result.current.profile.goal?.average).not.toBeNull());
  return view;
}

describe("useAnalyticsPageViewModel", () => {
  it("opens on Scoring over the last 50 rounds everywhere, with the courses to pick from", async () => {
    const { repository, result } = await loaded();

    expect(repository.requests[0]).toEqual(DEFAULT_FILTERS);
    expect(result.current.tab).toBe("scoring");
    expect(result.current.filtered).toBe(false);
    expect(result.current.analytics?.roundCount).toBe(24);
    expect(result.current.analytics?.headline.map((figure) => figure.metric)).toEqual([
      "scoring_average",
      "gir_percentage",
      "average_putts",
      "scrambling_percentage",
      "three_putt_rate",
    ]);
    await waitFor(() => expect(result.current.playedCourses).toHaveLength(3));
    await waitFor(() => expect(result.current.hasHomeCourse).toBe(true));
  });

  it("reads Profile's last 20 rounds only once it opens", async () => {
    const { repository, result } = await loaded(labGolfer);
    expect(repository.requests).toEqual([DEFAULT_FILTERS]);
    expect(result.current.profile.loading).toBe(true);

    act(() => result.current.setTab("profile"));
    await waitFor(() => expect(repository.requests).toContainEqual(PROFILE_FILTERS));
    act(() => result.current.setTab("scoring"));
    // Still loaded, so going back is instant.
    await waitFor(() => expect(result.current.profile.loading).toBe(false));
  });

  it("opens on the section the address names", async () => {
    const { result } = setup(golfer, undefined, "profile");
    expect(result.current.tab).toBe("profile");
  });

  it("loads the figures again for a course, and keeps the last ones up meanwhile", async () => {
    const { repository, result } = await loaded();

    repository.hold();
    act(() => result.current.setCourse(LINKS.id));

    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.analytics?.roundCount).toBe(24);
    expect(result.current.filtered).toBe(true);

    act(() => repository.finish());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.analytics?.roundCount).toBe(4);
    expect(repository.requests).toContainEqual({ ...DEFAULT_FILTERS, courseId: LINKS.id });
  });

  it("asks for the round count picked, and that alone doesn't narrow the courses", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setLimit(10));
    await waitFor(() => expect(repository.requests).toContainEqual({ ...DEFAULT_FILTERS, limit: 10 }));
    expect(result.current.filtered).toBe(false);
  });

  it("shows the empty state when the course has no rounds", async () => {
    const { result } = await loaded();

    act(() => result.current.setCourse(PRESIDIO.id));
    await waitFor(() => expect(result.current.showEmpty).toBe(true));
    expect(result.current.analytics?.roundCount).toBe(0);
  });

  it("surfaces a failed load, and loads again on retry", async () => {
    const { repository, result } = await loaded(golfer, (repo) => {
      repo.loadError = new Error("Analytics failed to load.");
    });

    expect(result.current.analytics).toBeNull();
    expect(result.current.loadError).toBe("Analytics failed to load.");

    repository.loadError = null;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.analytics?.roundCount).toBe(24));
  });

  it("switches the score trend between gross and net", async () => {
    const { result } = await loaded();

    expect(result.current.scoreReading).toBe("gross");
    act(() => result.current.setScoreReading("net"));
    expect(result.current.scoreReading).toBe("net");
  });

  it("opens Approach on par 4s and keeps the par type picked", async () => {
    const { result } = await loaded();

    expect(result.current.approachPar).toBe(4);
    act(() => result.current.setApproachPar(3));
    expect(result.current.approachPar).toBe(3);
  });

  describe("profile", () => {
    it("reads the last 20 rounds at every course through the shared analytics query", async () => {
      const { client, repository } = await profileLoaded();

      expect(repository.requests).toContainEqual(PROFILE_FILTERS);
      expect(client.getQueryData(queryKeys.analytics(labUser.id, PROFILE_FILTERS))).toBe(labAnalytics);
    });

    it("stands the goal on the server's report, savers in its order and words", async () => {
      const { result } = await profileLoaded();

      expect(result.current.profile.goal).toMatchObject({ target: 89, average: 91.7, gap: 2.7, lowestScore: 89 });
      expect(result.current.profile.goal?.savers.map((s) => s.kind)).toEqual([
        "three_putt_bleed",
        "blowup_holes",
        "gir_opportunity",
      ]);
    });

    it("has no goal, and asks for no report, until one is set", async () => {
      const { repository, result } = await loaded({ ...labGolfer, user: { ...labUser, scoring_goal: null } });
      act(() => result.current.setTab("profile"));
      await waitFor(() => expect(result.current.profile.loading).toBe(false));

      expect(result.current.profile.goal).toBeNull();
      expect(result.current.profile.peak).toBeNull();
      expect(repository.goalReportRequests).toBe(0);
    });

    it("saves a goal picked, and keeps the old one when the save fails", async () => {
      const { repository, result } = await profileLoaded();

      act(() => result.current.profile.setGoal(84));
      await waitFor(() => expect(result.current.profile.goal?.target).toBe(84));
      expect(repository.updates).toEqual([{ scoring_goal: 84 }]);

      repository.saveError = new Error("Forbidden");
      act(() => result.current.profile.setGoal(79));
      await waitFor(() => expect(result.current.profile.goalSaveError?.message).toBe("Forbidden"));
      expect(result.current.profile.goal?.target).toBe(84);
    });

    it("never shows the last goal's figures against a newly picked goal", async () => {
      const { repository, result } = await profileLoaded();
      expect(result.current.profile.goal?.attempts.length).toBeGreaterThan(0);
      repository.holdGoalReport();

      act(() => result.current.profile.setGoal(84));
      await waitFor(() => expect(result.current.profile.goal?.target).toBe(84));
      // The new goal's report is still on its way: no figures, rather than the last goal's.
      expect(result.current.profile.goal?.gap).toBeNull();
      expect(result.current.profile.goal?.attempts).toEqual([]);
      expect(result.current.profile.peak?.gapToGoal).toBeNull();

      act(() => repository.finishGoalReport());
      await waitFor(() => expect(result.current.profile.goal?.gap).not.toBeNull());
    });

    it("holds the shape up against the next level from the golfer's index until they pick another", async () => {
      const { repository, result } = await profileLoaded();

      // A 17.8 is compared with a 15 handicap.
      expect(result.current.profile.comparison).toBe(15);
      await waitFor(() => expect(result.current.profile.compared).toBe(true));
      expect(repository.benchmarkRequests[0]).toBe("handicap:15");
      expect(result.current.profile.standing.judged).toBe(6);

      act(() => result.current.profile.pickComparison(5, null));
      await waitFor(() => expect(repository.benchmarkRequests).toContain("handicap:5"));
      expect(result.current.profile.comparison).toBe(5);
      // Behind a 5 on every axis.
      await waitFor(() => expect(result.current.profile.standing.ahead).toEqual([]));
    });

    it("compares with a friend picked, and says when one has too few rounds", async () => {
      const { repository, result } = await profileLoaded();

      act(() => result.current.profile.pickComparison("friend", avery.id));
      expect(result.current.profile.friends.map((f) => f.name)).toEqual([avery.name, jordan.name]);
      await waitFor(() => expect(result.current.profile.friendComparison).toBe("ready"));

      act(() => result.current.profile.pickComparison("friend", jordan.id));
      await waitFor(() => expect(result.current.profile.friendComparison).toBe("no-rounds"));
      expect(result.current.profile.compared).toBe(false);
      expect(repository.benchmarkRequests).toContain(`friend:${jordan.id}`);
    });

    it("switches to the peak game, drawn against the nearest goal's shape", async () => {
      const { result } = await profileLoaded();

      act(() => result.current.profile.setRadarMode("peak"));
      expect(result.current.profile.radarMode).toBe("peak");
      await waitFor(() => expect(result.current.profile.compared).toBe(true));
      expect(result.current.profile.peakImpacts.map((impact) => impact.kind)).toEqual(["birdies", "bogeys", "doubles"]);
      expect(breaks90Shape.gir_percentage).toBe(benchmarkShapeFrom(breaks90Shape).girPct);
    });

    it("stays on the average when there is no peak game to show", async () => {
      const { result } = await loaded({ ...labGolfer, user: { ...labUser, scoring_goal: null } });
      act(() => result.current.setTab("profile"));
      await waitFor(() => expect(result.current.profile.loading).toBe(false));

      act(() => result.current.profile.setRadarMode("peak"));
      expect(result.current.profile.radarMode).toBe("benchmark");
      expect(result.current.profile.peakAvailable).toBe(false);
    });
  });
});
