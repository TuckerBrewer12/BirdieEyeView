import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "@/data/queryKeys";
import { FakeAnalyticsRepository } from "@/testing/fakes/FakeAnalyticsRepository";
import { withoutRounds } from "@/testing/fakes/analyticsResponses";
import { CAREER_LATER, CAREER_TODAY } from "@/testing/fixtures/career";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import type { AnalyticsDto } from "@/types/api";
import { CAREER_FILTERS } from "../model";
import { useCareerPageViewModel } from "../useCareerPageViewModel";

function setup(
  analytics: AnalyticsDto = sampleGolfer.analytics,
  today: Date = CAREER_TODAY,
  loadError: Error | null = null,
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const repository = new FakeAnalyticsRepository({ analytics });
  repository.loadError = loadError;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useCareerPageViewModel("user-1", repository, () => today), { wrapper });
  return { client, repository, result };
}

async function loaded(analytics?: AnalyticsDto, today?: Date) {
  const view = setup(analytics, today);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useCareerPageViewModel", () => {
  it("reads every round through the shared analytics query, the cache entry Analytics' All uses", async () => {
    const { client, repository, result } = await loaded();

    expect(repository.requests).toEqual([CAREER_FILTERS]);
    expect(CAREER_FILTERS).toEqual({ limit: 500, timeframe: "all", courseId: "all" });
    expect(client.getQueryData(queryKeys.analytics("user-1", CAREER_FILTERS))).toBe(sampleGolfer.analytics);
    expect(result.current.career).toMatchObject({ roundCount: 24, holesPlayed: 432, handicapIndex: 7 });
  });

  it("draws from Analytics' All rounds already in the cache without asking again", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(queryKeys.analytics("user-1", CAREER_FILTERS), sampleGolfer.analytics);
    const repository = new FakeAnalyticsRepository({ analytics: sampleGolfer.analytics });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCareerPageViewModel("user-1", repository, () => CAREER_TODAY), {
      wrapper,
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.career?.roundCount).toBe(24);
    expect(repository.requests).toEqual([]);
  });

  it("opens on the lifetime records, and switches to the last year's", async () => {
    const { result } = await loaded();
    expect(result.current.timeWindow).toBe("lifetime");
    expect(result.current.figures?.newRecords).toBeNull();
    expect(result.current.figures?.totals.find((total) => total.kind === "pars")?.value).toBe(183);

    act(() => result.current.setTimeWindow("one_year"));

    expect(result.current.timeWindow).toBe("one_year");
    expect(result.current.figures).toBe(result.current.career?.windows.one_year);
    expect(result.current.figures?.newRecords).toBe(7);
    expect(result.current.figures?.totals.find((total) => total.kind === "pars")).toBeUndefined();
  });

  it("counts a putting milestone in the last year only when it was first reached in it", async () => {
    const now = await loaded();
    const later = await loaded(sampleGolfer.analytics, CAREER_LATER);
    const breakThirty = (view: typeof now) =>
      view.result.current.career?.windows.one_year.putting.find(
        (milestone) => milestone.kind === "putt-break" && milestone.threshold === 30,
      )?.achieved;

    // Reached on 2026/3/1: inside the last year in June 2026, outside it by April 2027.
    expect(breakThirty(now)).toBe(true);
    expect(breakThirty(later)).toBe(false);
    expect(later.result.current.career?.windows.lifetime.putting.find((m) => m.kind === "putt-break" && m.threshold === 30)?.achieved).toBe(true);
  });

  it("is empty when the golfer has no rounds", async () => {
    const { result } = await loaded(withoutRounds(sampleGolfer.analytics));

    expect(result.current.showEmpty).toBe(true);
    expect(result.current.loadError).toBeNull();
  });

  it("reports a failed load, and a retry brings the career in", async () => {
    const view = setup(sampleGolfer.analytics, CAREER_TODAY, new Error("Analytics failed to load."));
    await waitFor(() => expect(view.result.current.loadError).toBe("Analytics failed to load."));
    expect(view.result.current.career).toBeNull();
    expect(view.result.current.showEmpty).toBe(false);

    view.repository.loadError = null;
    act(() => view.result.current.retry());

    await waitFor(() => expect(view.result.current.career?.roundCount).toBe(24));
    expect(view.result.current.loadError).toBeNull();
  });

  it("opens the phone's milestones on the score list, and switches lists", async () => {
    const { result } = await loaded();
    expect(result.current.milestoneGroup).toBe("scoring");

    act(() => result.current.setMilestoneGroup("gir"));

    expect(result.current.milestoneGroup).toBe("gir");
  });
});
