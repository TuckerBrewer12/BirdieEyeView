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
    expect(result.current.course?.location).toBe("Half Moon Bay, CA");
    expect(result.current.course?.par).toBe(72);
    expect(result.current.tees).toEqual([
      { name: "Blue", yards: 6500 },
      { name: "White", yards: 6100 },
    ]);
    expect(result.current.tee?.color).toBe("Blue");
    expect(result.current.nines.map((nine) => nine.side)).toEqual(["front", "back"]);
    expect(result.current.played).toBe(false);
    expect(result.current.analytics).toBeNull();
    expect(result.current.recentRounds).toEqual([]);
  });

  it("reads the scorecard off the tee the golfer picks", async () => {
    const repository = new FakeCoursesRepository();
    repository.fullCourses = [halfMoonBayCourse];
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.selectTee("White"));
    expect(result.current.tee?.color).toBe("White");
    expect(result.current.tee?.total_yardage).toBe(6100);
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
    expect(result.current.nines[0]?.holes[0]?.averageToPar).toBe(-0.5);
  });

  it("surfaces a load error when the course is missing", async () => {
    const { result } = renderVm(new FakeCoursesRepository(), "missing");
    await waitFor(() => expect(result.current.loadError).toBe("Course not found."));
    expect(result.current.course).toBeNull();
  });
});
