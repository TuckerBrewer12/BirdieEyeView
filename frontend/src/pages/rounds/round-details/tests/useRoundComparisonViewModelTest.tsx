import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import type { RoundComparison } from "@/types/analytics";
import { FakeRoundsRepository } from "@/testing/fakes/FakeRoundsRepository";
import { useRoundComparisonViewModel } from "../components/useRoundComparisonViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function row(label: string, value: number) {
  return { label, sample_size: 4, round_id: "round-1", primary_value: value, secondary_value: null };
}

const sampleComparison: RoundComparison = {
  score: [row("This round", 78)],
  putts: [row("This round", 32)],
  gir: [row("This round", 7)],
  three_putts: [row("This round", 2)],
  putts_per_gir: [row("This round", 1.8)],
  scrambling: [row("This round", 3)],
};

function renderVm(comparison: RoundComparison) {
  const repository = new FakeRoundsRepository({ comparison });
  return renderHook(() => useRoundComparisonViewModel("user-1", "round-1", repository), { wrapper });
}

describe("useRoundComparisonViewModel", () => {
  it("exposes finished comparison charts and Score as the active tab", async () => {
    const { result } = renderVm(sampleComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.charts.map((c) => c.title)).toEqual([
      "Score",
      "Putts",
      "GIR",
      "3-Putts",
      "Putts per GIR",
      "Scrambling",
    ]);
    expect(result.current.charts[0]?.bars[0]).toEqual({
      label: "This round",
      value: 78,
      sampleSize: 4,
    });
    expect(result.current.selectedCharts.map((c) => c.title)).toEqual(["Score"]);
  });

  it("a tab shows only its own charts", async () => {
    const { result } = renderVm(sampleComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    act(() => result.current.selectChartTab("short_game"));
    expect(result.current.chartTab).toBe("short_game");
    expect(result.current.selectedCharts.map((c) => c.title)).toEqual([
      "Putts",
      "3-Putts",
      "Putts per GIR",
      "Scrambling",
    ]);
  });

  it("ignores a tab it does not have", async () => {
    const { result } = renderVm(sampleComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    act(() => result.current.selectChartTab("driving"));
    expect(result.current.chartTab).toBe("score");
  });
});
