import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { storedRounds, nRounds } from "@/testing/fixtures/rounds";
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

function renderVm(seed: FakeRoundsRepositorySeed = { rounds: storedRounds }) {
  const repository = new FakeRoundsRepository(seed);
  return renderHook(() => useRoundsPageViewModel("user-1", repository), { wrapper });
}

describe("useRoundsPageViewModel", () => {
  it("puts the most-played course first after All courses", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseOptions.map((option) => option.label).slice(0, 2)).toEqual([
      "All courses",
      "Half Moon Bay",
    ]);
    expect(result.current.courseLabel).toBe("All courses");
  });

  it("the Best scope follows the server's order and shows Best score as the sort", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.pickScope("best"));
    expect(result.current.filteredRounds.map((r) => r.score)).toEqual([69, 72, 78, 85]);
    expect(result.current.sortKey).toBe("best");
    expect(result.current.sortLabel).toBe("Best score");
  });

  it("picking a sort leaves the Best scope", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.pickScope("best"));
    act(() => result.current.selectSort("oldest"));
    expect(result.current.scope).toBe("all");
    expect(result.current.sortLabel).toBe("Oldest");
  });

  it("tapping the pressed scope again keeps it", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.pickScope("last20"));
    act(() => result.current.pickScope(undefined));
    expect(result.current.scope).toBe("last20");
  });

  it("Last 20 keeps the 20 most recent rounds", async () => {
    const { result } = renderVm({ rounds: nRounds(25) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.pickScope("last20"));
    expect(result.current.filteredRounds).toHaveLength(20);
    expect(result.current.filteredRounds[0]?.course?.name).toBe("Course 25");
  });

  it("a course narrows the list and names the menu", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setCourse("Blue Rock"));
    expect(result.current.filteredRounds.map((r) => r.course?.name)).toEqual(["Blue Rock"]);
    expect(result.current.courseLabel).toBe("Blue Rock");
  });

  it("keeps the phone's search open while it holds a query", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.searchOpen).toBe(false);
    act(() => result.current.setSearch("blue"));
    expect(result.current.searchOpen).toBe(true);
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

  it("words the round being linked for the sheet's title", async () => {
    const { result } = renderVm();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.toggleLink("round-4"));
    expect(result.current.linking?.line).toMatch(/^Scanned Scorecard · \w{3} \d{1,2} · 85$/);
  });
});
