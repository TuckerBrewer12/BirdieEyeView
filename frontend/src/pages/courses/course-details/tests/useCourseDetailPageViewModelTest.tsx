import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCourseDetailPageViewModel } from "../useCourseDetailPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(repository: FakeCoursesRepository, courseId = "course-hmb") {
  return renderHook(() => useCourseDetailPageViewModel("user-1", courseId, repository), { wrapper });
}

describe("useCourseDetailPageViewModel", () => {
  it("offers only the course tab until the golfer has played here", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pageTabs.map((tab) => tab.key)).toEqual(["course"]);

    act(() => result.current.selectPageTab("performance"));
    expect(result.current.activeTab).toBe("course");
  });

  it("surfaces a load error when the course is missing", async () => {
    const { result } = renderVm(new FakeCoursesRepository(), "missing");
    await waitFor(() => expect(result.current.loadError).toBe("Course not found."));
    expect(result.current.course).toBeNull();
  });
});
