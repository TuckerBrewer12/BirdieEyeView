import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedRounds, nRounds } from "@/testing/fixtures/rounds";
import {
  FakeRoundsRepository,
  type FakeRoundsRepositorySeed,
} from "@/testing/fakes/FakeRoundsRepository";
import { useRoundsPageViewModel } from "../useRoundsPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(seed: FakeRoundsRepositorySeed = { rounds: populatedRounds }) {
  const repository = new FakeRoundsRepository(seed);
  return renderHook(() => useRoundsPageViewModel("user-1", repository), { wrapper });
}

describe("useRoundsPageViewModel", () => {
  it("puts the most-played course first among the course chips", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const courseChips = result.current.chips
      .filter((chip) => chip.mode !== "all" && chip.mode !== "l20" && chip.mode !== "best")
      .map((chip) => chip.label);
    expect(courseChips[0]).toBe("Half Moon Bay");
  });

  it("Best mode sorts by score ascending and locks sort", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilterMode("best"));
    expect(result.current.filteredRounds.map((r) => r.score)).toEqual([69, 72, 78, 85]);
    expect(result.current.sortLocked).toBe(true);
    expect(result.current.effectiveSortKey).toBe("total_score");
    expect(result.current.sortLabel).toBe("Score");
    expect(result.current.sortAsc).toBe(true);
  });

  it("L20 keeps the 20 most recent rounds", async () => {
    const { result } = renderVm({ rounds: nRounds(25) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilterMode("l20"));
    expect(result.current.filteredRounds).toHaveLength(20);
    expect(result.current.filteredRounds[0]?.course?.name).toBe("Course 25");
  });

  it("keeps the unfiltered list available after search", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rounds).toHaveLength(4);

    act(() => result.current.setSearch("blue"));
    expect(result.current.filteredRounds).toHaveLength(1);
    expect(result.current.rounds).toHaveLength(4);
  });

  it("toggleLink moves the panel rather than opening a second one", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.toggleLink("round-4"));
    act(() => result.current.toggleLink("round-1"));

    expect(result.current.isLinkOpen("round-4")).toBe(false);
    expect(result.current.isLinkOpen("round-1")).toBe(true);
  });
});
