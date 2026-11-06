import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCourseChartsViewModel } from "../components/useCourseChartsViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCourseChartsViewModel", () => {
  it("shows one tab's charts at a time and ignores unknown tabs", async () => {
    const repository = new FakeCoursesRepository();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderHook(() => useCourseChartsViewModel("user-1", "course-hmb", repository), { wrapper });
    await waitFor(() => expect(result.current.charts[0]?.rows).toHaveLength(18));
    expect(result.current.selectedCharts.map((chart) => chart.kind)).toEqual(["toPar", "scoreType"]);

    act(() => result.current.selectChartTab("variance"));
    expect(result.current.selectedCharts.map((chart) => chart.kind)).toEqual(["difficulty", "variance"]);

    act(() => result.current.selectChartTab("nonsense"));
    expect(result.current.chartTab).toBe("variance");
  });
});
