import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCourseDetailPageViewModel } from "../useCourseDetailPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(repository: FakeCoursesRepository, courseId = "course-hmb") {
  return renderHook(
    () => useCourseDetailPageViewModel("user-1", courseId, repository),
    { wrapper },
  );
}

function seededRepo() {
  const repository = new FakeCoursesRepository();
  repository.fullCourses = [halfMoonBayCourse];
  return repository;
}

describe("useCourseDetailPageViewModel", () => {
  it("defaults the selected tee to the longest yardage", async () => {
    const { result } = renderVm(seededRepo());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teeChips.map((chip) => chip.color)).toEqual(["Blue", "White"]);
    expect(result.current.teeChips.find((chip) => chip.selected)?.color).toBe("Blue");
    expect(result.current.teeChips.find((chip) => chip.color === "Blue")?.swatchClass).toBe("bg-score-double");
    expect(result.current.teeChips.find((chip) => chip.color === "White")?.swatchClass).toBe("bg-card ring-1 ring-border");
  });

  it("computes course handicap from HI, slope, rating, and par", async () => {
    const repository = seededRepo();
    repository.handicapIndex = 10.4;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teeChips[0]?.courseHandicapLabel).toBe("CH 12");

    act(() => result.current.selectTee("White"));
    expect(result.current.teeChips.find((chip) => chip.selected)?.color).toBe("White");
    expect(result.current.teeChips.find((chip) => chip.color === "White")?.courseHandicapLabel).toBe("CH 9");
  });

  it("maps personal par from hole averages when rounds have been played", async () => {
    const repository = seededRepo();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.frontNine.showPersonalAvg).toBe(true);
    expect(result.current.frontNine.holes[0]?.personalAvg).toBe("3.9");
  });

  it("exposes round history newest first for the history preview", async () => {
    const repository = seededRepo();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.roundHistory[0]).toEqual({
      id: "round-4",
      date: "2026-08-01T16:00:00.000Z",
      total_score: 74,
      to_par: 2,
    });
    expect(result.current.scoreTrend[0]).toMatchObject({
      dateLabel: "Mar 9, 2026",
      tickLabel: "03-09",
    });
  });

  it("exposes hero stats from the score trend", async () => {
    const repository = seededRepo();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showPerformanceTab).toBe(true);
    expect(result.current.heroStats).toEqual([
      { value: "4", label: "Rounds Played" },
      { value: "77.3", label: "Scoring Avg" },
      { value: "72", label: "Best Round" },
      { value: "85", label: "Worst Round" },
    ]);
  });

  it("hides the performance tab when no rounds have been played", async () => {
    const { result } = renderVm(seededRepo());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showPerformanceTab).toBe(false);
    expect(result.current.pageTabs.map((tab) => tab.key)).toEqual(["course"]);
  });

  it("surfaces a load error when the course is missing", async () => {
    const { result } = renderVm(new FakeCoursesRepository(), "missing");
    await waitFor(() => expect(result.current.loadError).toBe("Course not found."));
    expect(result.current.hasCourse).toBe(false);
  });
});
