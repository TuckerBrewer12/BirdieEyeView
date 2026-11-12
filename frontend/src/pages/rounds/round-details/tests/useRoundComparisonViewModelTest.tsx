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
  it("opens on the last 20 and keeps the comparison for the section to word", async () => {
    const { result } = renderVm(roundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.window).toBe("l20");
    expect(result.current.comparison).toEqual(roundComparison);
  });

  it("switches window, and keeps it when the pressed one is tapped again", async () => {
    const { result } = renderVm(roundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    act(() => result.current.pickWindow("l5"));
    expect(result.current.window).toBe("l5");
    act(() => result.current.pickWindow(undefined));
    expect(result.current.window).toBe("l5");
  });

  it("still shows a round with nothing before it", async () => {
    const { result } = renderVm(firstRoundComparison);
    await waitFor(() => expect(result.current.show).toBe(true));
    expect(result.current.comparison).toEqual(firstRoundComparison);
  });

  it("stays hidden with no comparison", async () => {
    const { result } = renderVm(null);
    await waitFor(() => expect(result.current.show).toBe(false));
    expect(result.current.comparison).toBeNull();
  });
});
