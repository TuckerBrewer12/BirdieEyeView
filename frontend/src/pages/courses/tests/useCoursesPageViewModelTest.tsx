import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { populatedCourses } from "@/testing/fixtures/courses";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCoursesPageViewModel } from "../useCoursesPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(repository: FakeCoursesRepository) {
  return renderHook(() => useCoursesPageViewModel("user-1", repository), { wrapper });
}

describe("useCoursesPageViewModel", () => {
  it("pluralizes the header subtitle from the visible count", async () => {
    const { result } = renderVm(new FakeCoursesRepository(populatedCourses));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.headerSubtitle).toBe("3 courses");

    const one = renderVm(new FakeCoursesRepository(populatedCourses.slice(0, 1)));
    await waitFor(() => expect(one.result.current.loading).toBe(false));
    expect(one.result.current.headerSubtitle).toBe("1 course");
  });

  it("debounces search before calling searchCourses", async () => {
    const repository = new FakeCoursesRepository(populatedCourses);
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(repository.getCoursesCalls).toEqual(["user-1"]);
    expect(repository.searchQueries).toEqual([]);

    act(() => result.current.setSearch("blue"));
    expect(repository.searchQueries).toEqual([]);

    await waitFor(() => expect(repository.searchQueries).toEqual(["blue"]));
    expect(result.current.visibleCourses.map((course) => course.name)).toEqual(["Blue Rock"]);
  });

  it("empty search loads the full course list", async () => {
    const repository = new FakeCoursesRepository(populatedCourses);
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("blue"));
    await waitFor(() => expect(repository.searchQueries).toEqual(["blue"]));

    act(() => result.current.setSearch(""));
    await waitFor(() => expect(repository.getCoursesCalls).toEqual(["user-1", "user-1"]));
    expect(result.current.visibleCourses).toHaveLength(3);
  });

  it("surfaces a load error for the view", async () => {
    const repository = new FakeCoursesRepository(populatedCourses);
    repository.error = new Error("Could not load courses.");
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.error).toBe("Could not load courses."));
  });

  it("does not show the empty copy when a load error is showing", async () => {
    const repository = new FakeCoursesRepository([]);
    repository.error = new Error("Could not load courses.");
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.error).toBe("Could not load courses."));
    expect(result.current.showEmpty).toBe(false);
    expect(result.current.visibleCourses).toEqual([]);
  });

  it("shows the empty copy only for a successful empty list", async () => {
    const { result } = renderVm(new FakeCoursesRepository([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.showEmpty).toBe(true);
  });
});
