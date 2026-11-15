import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
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
  it("shows the scorecard off the longest tee and the prompt to scan until the golfer has played here", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.courseName).toBe("Half Moon Bay");
    expect(result.current.course).toBe(halfMoonBayCourse);
    expect(result.current.tees).toEqual([
      { name: "Blue", yards: 6500 },
      { name: "White", yards: 6100 },
    ]);
    expect(result.current.tee).toBe(halfMoonBayCourse.tees[0]);
    expect(result.current.nines.map((nine) => nine.side)).toEqual(["front", "back"]);
    expect(result.current.played).toBe(false);
    expect(result.current.analytics).toBeNull();
    expect(result.current.recentRounds).toEqual([]);
  });

  it("a record that didn't load says so in place of the prompt to scan, and Retry reads it", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    repository.analytics = halfMoonBayAnalytics;
    repository.analyticsError = new Error("Stats are down.");
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.recordError).toBe("Stats are down."));
    expect(result.current.loadError).toBeNull();
    expect(result.current.courseName).toBe("Half Moon Bay");
    expect(result.current.played).toBe(false);

    repository.analyticsError = null;
    act(() => result.current.retryRecord());
    await waitFor(() => expect(result.current.played).toBe(true));
    expect(result.current.recordError).toBeNull();
  });

  it("reads the scorecard off the tee the golfer picks", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectTee("White"));
    expect(result.current.selectedTee).toBe("White");
    expect(result.current.tee).toBe(halfMoonBayCourse.tees[1]);
  });

  it("adds the golfer's record, rows and latest rounds once they have played here", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.played).toBe(true));

    expect(result.current.analytics?.roundsPlayed).toBe(2);
    expect(result.current.analytics?.scoringAverage).toBe(75);
    expect(result.current.analytics?.bestRound?.score).toBe(72);
    expect(result.current.analytics?.worstRound?.score).toBe(78);
    expect(result.current.recentRounds.map((round) => round.id)).toEqual(["round-1", "round-2"]);
    expect(result.current.nines[0]?.holes[0]?.averageToPar?.label).toBe("\u22120.5");
  });

  it("switches to the golfer's performance, with the holes in the order they pick", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.played).toBe(true));

    expect(result.current.view).toBe("course");
    act(() => result.current.pickView("performance"));
    expect(result.current.view).toBe("performance");
    expect(result.current.analytics?.scoreTrend.map((point) => [point.score, point.rollingAverage])).toEqual([
      [72, 72],
      [78, 75],
    ]);
    expect(result.current.averageLine).toEqual({ value: 75, label: "Avg 75.0" });
    expect(result.current.holes.map((hole) => hole.hole).slice(0, 3)).toEqual([1, 2, 3]);
    expect(result.current.analytics?.nineGreens).toEqual({
      front: (13 / 18) * 100,
      back: (14 / 18) * 100,
      total: 75,
    });

    act(() => result.current.pickHoleOrder("hardest"));
    expect(result.current.holes.map((hole) => hole.hole).slice(0, 7)).toEqual([3, 6, 9, 12, 15, 18, 1]);
    expect(result.current.courseHoles.map((hole) => hole.hole).slice(0, 3)).toEqual([1, 2, 3]);
  });

  it("stays on the course until the golfer has played it", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.pickView("performance"));
    expect(result.current.view).toBe("course");
  });

  it("surfaces a load error when the course is missing", async () => {
    const { result } = renderVm(new FakeCoursesRepository(), "missing");
    await waitFor(() => expect(result.current.loadError).toBe("Course not found."));
    expect(result.current.course).toBeNull();
  });
});
