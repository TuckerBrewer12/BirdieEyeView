import { renderHook, waitFor } from "@testing-library/react";
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
  it("hands over each chart under its tab", async () => {
    const repository = new FakeCoursesRepository();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderHook(() => useCourseChartsViewModel("user-1", "course-hmb", repository), { wrapper });
    await waitFor(() => expect(result.current.charts[0]?.rows).toHaveLength(18));
    expect(result.current.chartTabs.map((tab) => tab.key)).toEqual(["score", "gir", "putts", "variance"]);
    const tabOf = Object.fromEntries(result.current.charts.map((chart) => [chart.kind, chart.group]));
    expect(tabOf).toMatchObject({ toPar: "score", scoreType: "score", difficulty: "variance", variance: "variance" });
  });
});
