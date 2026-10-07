import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCoursePerformanceViewModel } from "../components/useCoursePerformanceViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCoursePerformanceViewModel", () => {
  it("reads the server's figures, the trend oldest first, and the rounds newest first", async () => {
    const repository = new FakeCoursesRepository();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderHook(
      () => useCoursePerformanceViewModel("user-1", "course-hmb", repository),
      { wrapper },
    );
    await waitFor(() => expect(result.current.roundsPlayed).toBe(2));

    expect([result.current.scoringAverage, result.current.bestScore, result.current.worstScore]).toEqual([75, 72, 78]);
    expect(result.current.trend.map((point) => point.score)).toEqual([72, 78]);
    expect(result.current.rounds.map((round) => round.id)).toEqual(["round-1", "round-2"]);
  });
});
