import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedRounds } from "@/testing/fixtures/rounds";
import {
  dashboardDetailRounds,
  dashboardGoalReport,
  dashboardUser,
  emptyAnalytics,
  populatedAnalytics,
  populatedDashboard,
} from "@/testing/fixtures/dashboard";
import { FakeDashboardRepository } from "@/testing/fakes/FakeDashboardRepository";
import { useDashboardPageViewModel } from "../useDashboardPageViewModel";
import { pickBestRound, whsBreakdown, dualTrendFrom } from "../model";
import { mixLegend } from "../present";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(seed: ConstructorParameters<typeof FakeDashboardRepository>[0] = {
  dashboard: populatedDashboard,
  analytics: populatedAnalytics,
  user: dashboardUser,
  goalReport: dashboardGoalReport,
  rounds: dashboardDetailRounds,
}) {
  const repository = new FakeDashboardRepository(seed);
  const hook = renderHook(
    () => useDashboardPageViewModel("user-1", repository),
    { wrapper },
  );
  return { ...hook, repository };
}

describe("useDashboardPageViewModel", () => {
  it("exposes scoring average, handicap, and mix after load", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.last20ScoringAvg).toBeCloseTo(76.8, 1);
    expect(result.current.data?.handicap_index).toBe(12.4);
    expect(result.current.user?.name).toBe("Test Golfer");
    expect(mixLegend(result.current.l20ScoreMix).map((i) => i.label)).toEqual([
      "Birdie+",
      "Par",
      "Bogey",
      "Dbl",
      "Tpl+",
    ]);
  });

  it("opens and closes the handicap sheet", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.handicapSheetOpen).toBe(false);
    act(() => result.current.openHandicapSheet());
    expect(result.current.handicapSheetOpen).toBe(true);
    act(() => result.current.closeHandicapSheet());
    expect(result.current.handicapSheetOpen).toBe(false);
  });

  it("builds WHS rows from differentials and marks the used round", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.whs.rows.length).toBe(5);
    expect(result.current.whs.showCalculation).toBe(true);
    expect(result.current.whs.countUsed).toBe(1);
    const used = result.current.whs.rows.filter((r) => r.used);
    expect(used).toHaveLength(1);
    expect(used[0]?.courseName).toBe("Blue Rock");
  });

  it("picks the lowest scoring round as best, hole strip and all", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.bestRound?.id).toBe("round-3"));
    expect(result.current.bestRound?.total_score).toBe(69);
    expect(result.current.bestRound?.hole_scores_summary).toBeTruthy();
  });

  it("fetches the three most recent rounds for hole strips", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.recentSummaries).toHaveLength(3));
    expect(result.current.recentSummaries.map((r) => r.id)).toEqual(
      populatedRounds.slice(0, 3).map((r) => r.id),
    );
    expect(repository.fetchedRoundIds).toEqual(
      expect.arrayContaining(populatedRounds.slice(0, 3).map((r) => r.id)),
    );
  });

  it("defaults the trend tab to score and can switch to HCP", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trendView).toBe("score");
    act(() => result.current.setTrendView("hcp"));
    expect(result.current.trendView).toBe("hcp");
  });

  it("surfaces an error when the dashboard fetch fails", async () => {
    const { result } = renderVm({
      dashboardError: new Error("Dashboard data failed to load."),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Dashboard data failed to load.");
  });

  it("still loads when analytics fails", async () => {
    const { result } = renderVm({
      dashboard: populatedDashboard,
      analyticsError: new Error("no trends"),
      rounds: dashboardDetailRounds,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.total_rounds).toBe(4);
    expect(result.current.trends).toBeNull();
    expect(result.current.dualData).toEqual([]);
  });

  it("exposes the scoring goal from the user and report", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.scoringGoal).toBe(79);
    expect(result.current.goalOnTrack).toBe(false);
    expect(result.current.goalReport?.savers[0]?.headline).toBe("Fewer three-putts");
  });

  it("has no best round or WHS rows when there is no index", async () => {
    const { result } = renderVm({
      dashboard: { ...populatedDashboard, handicap_index: null, recent_rounds: [] },
      analytics: emptyAnalytics(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.handicap_index).toBeNull();
    expect(result.current.bestRound).toBeNull();
    expect(result.current.whs.rows).toEqual([]);
  });
});

describe("dashboard model", () => {
  it("picks the lowest score as best", () => {
    expect(pickBestRound(populatedRounds)?.id).toBe("round-3");
    expect(pickBestRound([])).toBeNull();
  });

  it("marks used WHS rounds from dual trend", () => {
    const dual = dualTrendFrom(populatedAnalytics);
    const whs = whsBreakdown(dual, populatedAnalytics, 12.4);
    expect(whs.rows.filter((r) => r.used)).toHaveLength(1);
    expect(whs.showCalculation).toBe(true);
  });
});
