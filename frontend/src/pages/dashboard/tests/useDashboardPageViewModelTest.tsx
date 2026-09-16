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
  it("exposes scoring average, handicap label, and mix after load", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.last20ScoringAvgLabel).toBe("76.8");
    expect(result.current.handicapIndexLabel).toBe("12.4");
    expect(result.current.firstName).toBe("Test");
    expect(result.current.mixLegend.map((i) => i.label)).toEqual([
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
    expect(result.current.whsRows.length).toBe(5);
    expect(result.current.whsShowCalculation).toBe(true);
    expect(result.current.whsCountUsed).toBe(1);
    const used = result.current.whsRows.filter((r) => r.used);
    expect(used).toHaveLength(1);
    expect(used[0]?.courseLabel).toBe("Blue Rock");
  });

  it("formats a plus handicap", async () => {
    const { result } = renderVm({
      dashboard: { ...populatedDashboard, handicap_index: -1.2 },
      analytics: populatedAnalytics,
      rounds: dashboardDetailRounds,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.handicapIndexLabel).toBe("+1.2");
  });

  it("picks the lowest scoring round as best and fetches its detail", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.bestRound?.id).toBe("round-3"));
    expect(result.current.bestRound?.totalScore).toBe(69);
    expect(repository.fetchedRoundIds).toContain("round-3");
  });

  it("fetches the three most recent rounds for hole strips", async () => {
    const { result, repository } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.recentRoundRows).toHaveLength(3));
    expect(result.current.recentRoundRows.map((r) => r.id)).toEqual(
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
    expect(result.current.trendTabs.find((t) => t.active)?.key).toBe("score");
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

  it("exposes goal labels from the report", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasScoringGoal).toBe(true);
    expect(result.current.goalTargetLabel).toBe("Break 80");
    expect(result.current.goalNumberLabel).toBe("80");
    expect(result.current.goalFocusHeadline).toBe("Fewer three-putts");
  });

  it("shows a dash handicap when there is no index", async () => {
    const { result } = renderVm({
      dashboard: { ...populatedDashboard, handicap_index: null, recent_rounds: [] },
      analytics: emptyAnalytics(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.handicapIndexLabel).toBe("—");
    expect(result.current.bestRound).toBeNull();
    expect(result.current.whsRows).toEqual([]);
  });
});
