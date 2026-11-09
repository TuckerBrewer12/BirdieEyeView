import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedRounds } from "@/testing/fixtures/rounds";
import {
  dashboardGoalReport,
  dashboardUser,
  populatedDashboard,
} from "@/testing/fixtures/dashboard";
import { FakeDashboardRepository } from "@/testing/fakes/FakeDashboardRepository";
import { useDashboardPageViewModel } from "../useDashboardPageViewModel";
import { bestRoundFrom } from "../model";
import { greetingFor, lastRoundLabel, ninesAndTee } from "../present";
import { Round } from "@/domain";

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
  it("leads with the newest round and its running score", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lastRound?.id).toBe(populatedRounds[0].id);
    expect(result.current.lastRoundFlow).toHaveLength(18);
    expect(result.current.lastRoundFlow[17]).toEqual({ hole: 18, toPar: 6 });
    expect(result.current.user?.name).toBe("Test Golfer");
  });

  it("lists the three rounds before the last one", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentRounds.map((r) => r.id)).toEqual(populatedRounds.slice(1, 4).map((r) => r.id));
  });

  it("carries the index and its move this month", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.handicap).toEqual({ index: 12.4, change: -1.6, verdict: "good" });
    expect(result.current.handicapLine).toEqual(populatedDashboard.handicap_trend.map((row) => row.handicap_index));
    expect(result.current.averageLine).toEqual(populatedDashboard.score_trend.map((row) => row.rolling_average));
  });

  it("carries the best round, the season and the goal as the server and goal report have them", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.goal?.progressPct).toBe(82));
    expect(result.current.best).toEqual({
      roundId: "round-3",
      score: 69,
      toPar: -3,
      course: "Blue Rock",
      date: "2026-04-18T18:00:00.000Z",
    });
    expect(result.current.season.rounds).toBe(4);
    expect(result.current.season.months).toHaveLength(6);
    expect(result.current.goal).toEqual({ target: 79, progressPct: 82, onTrack: true });
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
    expect(result.current.whs.countUsed).toBe(1);
    const used = result.current.whs.rows.filter((r) => r.used);
    expect(used).toHaveLength(1);
    expect(used[0]?.courseName).toBe("Blue Rock");
  });

  it("surfaces an error when the dashboard fetch fails", async () => {
    const { result } = renderVm({
      dashboardError: new Error("Dashboard data failed to load."),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe("Dashboard data failed to load.");
  });

  it("has no last round, best round or move before the first round", async () => {
    const { result } = renderVm({
      dashboard: {
        ...populatedDashboard,
        handicap_index: null,
        best_round: null,
        best_round_id: null,
        recent_rounds: [],
        last_round_flow: [],
        handicap_change: { ...populatedDashboard.handicap_change, this_month: null, this_month_verdict: null },
      },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lastRound).toBeNull();
    expect(result.current.lastRoundFlow).toEqual([]);
    expect(result.current.recentRounds).toEqual([]);
    expect(result.current.best).toBeNull();
    expect(result.current.handicap).toEqual({ index: null, change: null, verdict: null });
  });
});

describe("dashboard wording", () => {
  it("greets by the hour", () => {
    expect(greetingFor(new Date(2026, 5, 15, 8))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 5, 15, 13))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 5, 15, 19))).toBe("Good evening");
  });

  it("names the last round's day, with its weekday on a wide screen", () => {
    expect(lastRoundLabel("2026-06-15T18:00:00.000Z", { weekday: true })).toBe("Last round · Mon, Jun 15");
    expect(lastRoundLabel("2026-06-15T18:00:00.000Z", { weekday: false })).toBe("Last round · Jun 15");
    expect(lastRoundLabel(null, { weekday: true })).toBe("Last round");
  });

  it("sets the nines beside the tee", () => {
    const round = Round.fromSummary(populatedRounds[0]);
    expect(ninesAndTee(round)).toBe(`${round.frontNine.total} · ${round.backNine.total} · Blue`);
  });

  it("has no best round before a scored one", () => {
    expect(bestRoundFrom({ ...populatedDashboard, best_round: null })).toBeNull();
  });
});
