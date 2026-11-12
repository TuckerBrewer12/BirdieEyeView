import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { halfMoonBayCourse, ratedHalfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCourseScorecardViewModel } from "../components/useCourseScorecardViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Renders the view model once the course has loaded, as it has by the time the page shows the scorecard. */
async function renderVm(repository: FakeCoursesRepository, course = halfMoonBayCourse) {
  repository.fullCourses = [course];
  const courseId = course.id ?? "";
  const rendered = renderHook(() => useCourseScorecardViewModel("user-1", courseId, repository), { wrapper });
  await waitFor(() => expect(rendered.result.current).not.toBeNull());
  return {
    current: () => {
      const viewModel = rendered.result.current;
      if (!viewModel) throw new Error("The course has not loaded.");
      return viewModel;
    },
  };
}


describe("useCourseScorecardViewModel", () => {
  it("is empty until the course has loaded", () => {
    const { result } = renderHook(() => useCourseScorecardViewModel("user-1", "course-missing", new FakeCoursesRepository()), { wrapper });
    expect(result.current).toBeNull();
  });

  it("shows the course handicap the server sends on each tee", async () => {
    const vm = await renderVm(new FakeCoursesRepository(), ratedHalfMoonBayCourse);
    expect(vm.current().teeOptions[0]?.courseHandicap).toBe(12);
    expect(vm.current().teeOptions[1]?.courseHandicap).toBe(9);
    expect(vm.current().teeOptions[0]?.detail).toMatch(/ · CH 12$/);
  });

  it("shows no course handicap on a tee the server sent none for", async () => {
    const vm = await renderVm(new FakeCoursesRepository());
    expect(vm.current().teeOptions.map((tee) => tee.courseHandicap)).toEqual([null, null]);
  });

  it("clears the tee when the golfer clears it, hiding the yards row", async () => {
    const vm = await renderVm(new FakeCoursesRepository());
    expect(vm.current().selectedTee).toBe("Blue");

    act(() => vm.current().selectTee("White"));
    expect(vm.current().selectedTee).toBe("White");

    act(() => vm.current().clearTee());
    expect(vm.current().selectedTee).toBeNull();
    expect(vm.current().backNine.tee).toBeNull();
  });

  it("adds the golfer's hole averages once they have played the course", async () => {
    const repository = new FakeCoursesRepository();
    repository.analytics = halfMoonBayAnalytics;
    const vm = await renderVm(repository);
    await waitFor(() => expect(vm.current().frontNine.holes[0]?.personalAverage).toBe(3.5));
  });
});
