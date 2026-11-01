import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { FakeAnalyticsRepository, type FakeAnalyticsSeed } from "@/testing/fakes/FakeAnalyticsRepository";
import { DEFAULT_FILTERS } from "../model";
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

function setup(seed: FakeAnalyticsSeed = golfer, configure?: (repository: FakeAnalyticsRepository) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeAnalyticsRepository(seed);
  configure?.(repository);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useAnalyticsPageViewModel(USER_ID, repository), { wrapper });
  return { client, repository, result };
}

async function loaded(seed?: FakeAnalyticsSeed, configure?: (repository: FakeAnalyticsRepository) => void) {
  const view = setup(seed, configure);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useAnalyticsPageViewModel", () => {
  it("opens on the last 50 rounds everywhere, with the courses to filter by", async () => {
    const { repository, result } = await loaded();

    expect(repository.requests).toEqual([DEFAULT_FILTERS]);
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
    expect(result.current.filtered).toBe(false);
    expect(result.current.analytics?.roundCount).toBe(24);
    expect(result.current.showEmpty).toBe(false);
    expect(result.current.loadError).toBeNull();
    await waitFor(() => expect(result.current.playedCourses.map((course) => course.name)).toEqual([
      "Half Moon Bay Golf Links",
      "Presidio Golf Course",
      "Sharp Park Golf Course",
    ]));
    await waitFor(() => expect(result.current.hasHomeCourse).toBe(true));
  });

  it("does not offer a home course to a golfer without one", async () => {
    const { result } = await loaded({ ...golfer, user: { ...sampleGolfer.profile, home_course_id: null } });
    await waitFor(() => expect(result.current.playedCourses).toHaveLength(3));
    expect(result.current.hasHomeCourse).toBe(false);
  });

  it("loads the figures again for a course, and keeps the last ones up meanwhile", async () => {
    const { repository, result } = await loaded();

    repository.hold();
    act(() => result.current.setFilters({ ...result.current.filters, courseId: LINKS.id }));

    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.analytics?.roundCount).toBe(24);
    expect(result.current.filtered).toBe(true);

    act(() => repository.finish());
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.analytics?.roundCount).toBe(4);
    expect(repository.requests.at(-1)).toEqual({ ...DEFAULT_FILTERS, courseId: LINKS.id });
  });

  it("asks for each timeframe and round count it is given", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setFilters({ ...result.current.filters, timeframe: "ytd" }));
    await waitFor(() => expect(repository.requests).toHaveLength(2));
    act(() => result.current.setFilters({ ...result.current.filters, limit: 10 }));
    await waitFor(() => expect(repository.requests).toHaveLength(3));

    expect(repository.requests.slice(1)).toEqual([
      { limit: 50, timeframe: "ytd", courseId: "all" },
      { limit: 10, timeframe: "ytd", courseId: "all" },
    ]);
    expect(result.current.filtered).toBe(true);
  });

  it("shows filters it has seen straight from the cache", async () => {
    const { repository, result } = await loaded();

    act(() => result.current.setFilters({ ...result.current.filters, courseId: LINKS.id }));
    await waitFor(() => expect(result.current.analytics?.roundCount).toBe(4));
    repository.hold();
    act(() => result.current.setFilters(DEFAULT_FILTERS));

    expect(result.current.analytics?.roundCount).toBe(24);
    expect(result.current.refreshing).toBe(false);
    act(() => repository.finish());
  });

  it("shows the empty state when no round matches the filters", async () => {
    const { result } = await loaded();

    act(() => result.current.setFilters({ ...result.current.filters, courseId: PRESIDIO.id }));
    await waitFor(() => expect(result.current.showEmpty).toBe(true));
    expect(result.current.filtered).toBe(true);
    expect(result.current.analytics?.roundCount).toBe(0);
  });

  it("surfaces a failed load, and loads again on retry", async () => {
    const { repository, result } = await loaded(golfer, (repo) => {
      repo.loadError = new Error("Analytics failed to load.");
    });

    expect(result.current.analytics).toBeNull();
    expect(result.current.loadError).toBe("Analytics failed to load.");
    expect(result.current.showEmpty).toBe(false);

    repository.loadError = null;
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.analytics?.roundCount).toBe(24));
    expect(result.current.loadError).toBeNull();
  });

  it("reads the golfer from the shared user query", async () => {
    const { client } = await loaded();
    await waitFor(() => expect(client.getQueryData(queryKeys.user(USER_ID))).toEqual(sampleGolfer.profile));
  });

  it("opens the phone layout on scoring and switches sections", async () => {
    const { result } = await loaded();

    expect(result.current.tab).toBe("scoring");
    act(() => result.current.setTab("putting"));
    expect(result.current.tab).toBe("putting");
  });
});
