import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";
import {
  dashboardGoalReport,
  dashboardUser,
  populatedDashboard,
} from "@/testing/fixtures/dashboard";
import { FakeDashboardRepository } from "@/testing/fakes/FakeDashboardRepository";
import { useDashboardPageViewModel } from "../useDashboardPageViewModel";
import { bestRecentRoundFrom, windowFiguresFrom } from "../model";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(seed: ConstructorParameters<typeof FakeDashboardRepository>[0] = {
  dashboard: populatedDashboard,
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
  it("measures the last five rounds first, as the server worked them out", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.window).toBe("last5");
    expect(result.current.figures).toEqual(windowFiguresFrom(populatedDashboard.windows.last_5));
    expect(result.current.figures).toMatchObject({ scoringAverage: 76.8, scoringAverageChange: -2.1, handicapChange: -1.6 });
    expect(result.current.data?.handicap_index).toBe(12.4);
    expect(result.current.user?.name).toBe("Test Golfer");
  });

  it("switches to the last 20 rounds", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setWindow("last20"));
    expect(result.current.window).toBe("last20");
    expect(result.current.figures).toEqual(windowFiguresFrom(populatedDashboard.windows.last_20));
    expect(result.current.figures?.scoringAverageVerdict).toBe("bad");
  });

  it("has no score mix for a window without a scored hole", () => {
    const figures = windowFiguresFrom({ ...populatedDashboard.windows.last_5, score_mix_holes: 0 });
    expect(figures.scoreMix).toBeNull();
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

  it("shows the listed round the server picked as best, hole strip and all", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.bestRound?.id).toBe("round-3"));
    expect(result.current.bestRound?.score).toBe(69);
    expect(result.current.bestRound?.holes).toHaveLength(18);
  });

  it("lists four recent rounds on a wide screen and three on a phone, hole strips and all", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.recentRounds).toHaveLength(4));
    expect(result.current.recentRounds.map((r) => r.id)).toEqual(
      populatedRounds.slice(0, 4).map((r) => r.id),
    );
    expect(result.current.phoneRounds.map((r) => r.id)).toEqual(
      populatedRounds.slice(0, 3).map((r) => r.id),
    );
    expect(result.current.recentRounds[0].holes[0].kind).toBe("bogey");
  });

  it("surfaces an error when the dashboard fetch fails", async () => {
    const { result } = renderVm({
      dashboardError: new Error("Dashboard data failed to load."),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Dashboard data failed to load.");
  });

  it("draws the window's rounds from the dashboard response", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trend).toHaveLength(5);
    expect(result.current.trend[1]).toMatchObject({ score: 69, differentialStatus: "counting" });
    expect(result.current.handicapLine).toEqual(populatedDashboard.handicap_trend.map((row) => row.handicap_index));
    expect(result.current.averageLine).toEqual(populatedDashboard.score_trend.map((row) => row.rolling_average));
    expect(result.current.scramblingLine).toEqual([37.5, 37.5, 37.5, 37.5, 37.5]);
  });

  it("draws only the last five of a longer trend while the last five are picked", async () => {
    const { result } = renderVm({
      dashboard: {
        ...populatedDashboard,
        score_trend: [...populatedDashboard.score_trend, ...populatedDashboard.score_trend],
        handicap_trend: [...populatedDashboard.handicap_trend, ...populatedDashboard.handicap_trend],
      },
      user: dashboardUser,
      goalReport: dashboardGoalReport,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.trend).toHaveLength(5);
    act(() => result.current.setWindow("last20"));
    expect(result.current.trend).toHaveLength(10);
  });

  it("has no trend while the window is empty", async () => {
    const { result } = renderVm({
      dashboard: { ...populatedDashboard, score_trend: [], handicap_trend: [], scrambling_trend: [], up_and_down_trend: [] },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.total_rounds).toBe(4);
    expect(result.current.trend).toEqual([]);
    expect(result.current.averageLine).toEqual([]);
    expect(result.current.scramblingLine).toEqual([]);
  });

  it("exposes the scoring goal from the user and report", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.goal?.focus).toBe("Fewer three-putts"));
    expect(result.current.goal).toMatchObject({ target: 79, average: 76.8, progressPct: 82, onTrack: true });
  });

  it("has no best round or WHS rows when there is no index", async () => {
    const { result } = renderVm({
      dashboard: {
        ...populatedDashboard,
        handicap_index: null,
        recent_rounds: [],
        whs: { ...populatedDashboard.whs, rows: [], window_size: 0, count_used: 0, show_calculation: false },
      },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.handicap_index).toBeNull();
    expect(result.current.bestRound).toBeNull();
    expect(result.current.whs.rows).toEqual([]);
  });
});

describe("dashboard model", () => {
  it("finds the round the server picked as best among those listed", () => {
    const rounds = populatedRounds.map(Round.fromSummary);
    expect(bestRecentRoundFrom(rounds, "round-3")?.id).toBe("round-3");
    expect(bestRecentRoundFrom(rounds, null)).toBeNull();
    expect(bestRecentRoundFrom([], "round-3")).toBeNull();
  });
});
