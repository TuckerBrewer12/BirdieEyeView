import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedRounds, nRounds } from "@/testing/fixtures/rounds";
import { pebbleBeach } from "@/testing/fixtures/courses";
import {
  FakeRoundsRepository,
  type FakeRoundsRepositorySeed,
} from "@/testing/fakes/FakeRoundsRepository";
import { useRoundsPageViewModel } from "./useRoundsPageViewModel";

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
  it("exposes All / L20 / Best chips plus top courses", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.chips.map((c) => c.label)).toEqual([
      "All",
      "L20",
      "Best",
      "Half Moon Bay",
      "Blue Rock",
      "Scanned Scorecard",
    ]);
  });

  it("search filters by course name", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSearch("blue"));
    expect(result.current.filteredRounds.map((r) => r.course_name)).toEqual(["Blue Rock"]);
  });

  it("Best mode sorts by score ascending and locks sort", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilterMode("best"));
    expect(result.current.filteredRounds.map((r) => r.total_score)).toEqual([69, 72, 78, 85]);
    expect(result.current.sortLocked).toBe(true);
    expect(result.current.effectiveSortKey).toBe("total_score");
  });

  it("L20 keeps the 20 most recent rounds", async () => {
    const { result } = renderVm({ rounds: nRounds(25) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilterMode("l20"));
    expect(result.current.filteredRounds).toHaveLength(20);
    expect(result.current.filteredRounds[0]?.course_name).toBe("Course 25");
  });

  it("loadMore reveals the next page", async () => {
    const { result } = renderVm({ rounds: nRounds(21) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.visibleRounds).toHaveLength(20);
    expect(result.current.remainingCount).toBe(1);
    act(() => result.current.loadMore());
    expect(result.current.visibleRounds).toHaveLength(21);
    expect(result.current.remainingCount).toBe(0);
  });

  it("selectSortKey by score orders descending", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.selectSortKey("total_score"));
    expect(result.current.filteredRounds.map((r) => r.total_score)).toEqual([85, 78, 72, 69]);
  });

  it("linking a course replaces the round and closes the panel", async () => {
    const { result } = renderVm({ rounds: populatedRounds, courses: [pebbleBeach] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLink("round-4"));
    expect(result.current.linkingRoundId).toBe("round-4");

    await act(async () => {
      await result.current.handleSelectCourse("round-4", pebbleBeach);
    });
    expect(result.current.linkingRoundId).toBeNull();
    expect(result.current.filteredRounds.find((r) => r.id === "round-4")?.course_name).toBe(
      "Pebble Beach",
    );
  });

  it("a failed link sets linkError and leaves the panel open", async () => {
    const { result } = renderVm({ rounds: populatedRounds, linkError: "nope" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLink("round-4"));
    await act(async () => {
      await result.current.handleSelectCourse("round-4", pebbleBeach);
    });
    expect(result.current.linkError).toBe("nope");
    expect(result.current.linkingRoundId).toBe("round-4");
  });
});
