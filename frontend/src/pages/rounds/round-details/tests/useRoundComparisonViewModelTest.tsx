import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import type { RoundComparisonDto } from "@/types/api";
import { FakeRoundsRepository } from "@/testing/fakes/FakeRoundsRepository";
import { firstRoundComparison, roundComparison } from "@/testing/fixtures/roundDetails";
import { useRoundComparisonViewModel } from "../components/useRoundComparisonViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(comparison: RoundComparisonDto | null) {
  const repository = new FakeRoundsRepository({ comparison });
  return renderHook(() => useRoundComparisonViewModel("user-1", "round-1", repository), { wrapper });
}

describe("useRoundComparisonViewModel", () => {
  it("opens on the last 20, each figure worded with its difference and the server's verdict", async () => {
    const { result } = renderVm(roundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.window).toBe("l20");
    expect(result.current.rows.map((row) => [row.label, row.value, row.average, row.difference, row.verdict])).toEqual([
      ["Score", "78", "80.4", "−2.4", "good"],
      ["Putts", "32", "33.1", "−1.1", "good"],
      ["Greens hit", "7", "4.9", "+2.1", "good"],
      ["3-putts", "1", "1.9", "−0.9", "good"],
      ["Putts / GIR", "1.71", "1.95", "−0.24", "good"],
      ["Scrambling", "4", "2.6", "+1.4", "good"],
    ]);
  });

  it("switches window, and keeps it when the pressed one is tapped again", async () => {
    const { result } = renderVm(roundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    act(() => result.current.pickWindow("l5"));
    expect(result.current.rows[0]?.average).toBe("81.4");
    act(() => result.current.pickWindow(undefined));
    expect(result.current.window).toBe("l5");
  });

  it("has no rows for a round with nothing before it", async () => {
    const { result } = renderVm(firstRoundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.rows).toEqual([]);
  });

  it("stays hidden with no comparison", async () => {
    const { result } = renderVm(null);
    await waitFor(() => expect(result.current.show).toBe(false));
  });
});
