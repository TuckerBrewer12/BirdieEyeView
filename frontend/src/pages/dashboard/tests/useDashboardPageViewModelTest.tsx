import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import {
  dashboardGoalReport,
  dashboardUser,
  emptyAnalytics,
  populatedAnalytics,
  populatedDashboard,
} from "@/testing/fixtures/dashboard";
import { FakeDashboardRepository } from "@/testing/fakes/FakeDashboardRepository";
import { useDashboardPageViewModel } from "../useDashboardPageViewModel";
import { pickBestRound, shortGameTrendFrom } from "../model";

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
    expect(result.current.l20ScoreMix).toEqual(populatedDashboard.score_mix);
    expect(result.current.recentScores).toEqual(
      populatedAnalytics.score_trend.flatMap((row) => (row.total_score != null ? [row.total_score] : [])),
    );
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
    expect(result.current.bestRound?.score).toBe(69);
    expect(result.current.bestRound?.holes).toHaveLength(18);
  });

  it("shows the three most recent rounds with the hole strips the list carries", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.recentRounds).toHaveLength(3));
    expect(result.current.recentRounds.map((r) => r.id)).toEqual(
      populatedRounds.slice(0, 3).map((r) => r.id),
    );
    expect(result.current.recentRounds[0].holes[0].kind).toBe("bogey");
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
        });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.total_rounds).toBe(4);
    expect(result.current.trends).toBeNull();
    expect(result.current.dualData).toEqual([]);
  });

  it("exposes the scoring goal from the user and report", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.goal?.focus).toBe("Fewer three-putts"));
    expect(result.current.goal).toMatchObject({ target: 79, average: 76.8, onTrack: false });
  });

  it("has no best round or WHS rows when there is no index", async () => {
    const { result } = renderVm({
      dashboard: {
        ...populatedDashboard,
        handicap_index: null,
        recent_rounds: [],
        whs: { ...populatedDashboard.whs, rows: [], window_size: 0, count_used: 0, show_calculation: false },
      },
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
    expect(pickBestRound(populatedRounds.map(Round.fromSummary))?.id).toBe("round-3");
    expect(pickBestRound([])).toBeNull();
  });

  it("pairs scrambling and up-and-down by round and keeps the last twelve", () => {
    const rounds = Array.from({ length: 14 }, (_, i) => i + 1);
    const trend = shortGameTrendFrom({
      ...emptyAnalytics(),
      scrambling_trend: rounds.map((i) => ({
        round_index: i,
        round_id: `r${i}`,
        scramble_opportunities: 8,
        scramble_successes: 4,
        scrambling_percentage: i,
      })),
      // Round 14 has no up-and-down chance, so it drops out of both lines.
      up_and_down_trend: rounds.slice(0, 13).map((i) => ({
        round_index: i,
        round_id: `r${i}`,
        opportunities: 5,
        successes: 2,
        percentage: i * 10,
      })),
    });
    expect(trend?.scrambling).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(trend?.upAndDown).toEqual([20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130]);
    expect(shortGameTrendFrom(emptyAnalytics())).toBeNull();
  });

});
