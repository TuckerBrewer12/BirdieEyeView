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

function renderVm(repository: FakeCoursesRepository, course = halfMoonBayCourse) {
  return renderHook(() => useCourseScorecardViewModel("user-1", course, repository), { wrapper });
}

const selected = (chips: { tee: { color: string | null }; selected: boolean }[]) =>
  chips.find((chip) => chip.selected)?.tee.color ?? null;

describe("useCourseScorecardViewModel", () => {
  it("shows the course handicap the server sends on each tee", async () => {
    const { result } = renderVm(new FakeCoursesRepository(), ratedHalfMoonBayCourse);
    await waitFor(() => expect(result.current.teeChips[0]?.courseHandicap).toBe(12));
    expect(result.current.teeChips[1]?.courseHandicap).toBe(9);
  });

  it("shows no course handicap on a tee the server sent none for", () => {
    const { result } = renderVm(new FakeCoursesRepository());
    expect(result.current.teeChips.map((chip) => chip.courseHandicap)).toEqual([null, null]);
  });

  it("clears the tee when the picked one is tapped again, hiding the yards row", async () => {
    const { result } = renderVm(new FakeCoursesRepository());
    expect(selected(result.current.teeChips)).toBe("Blue");

    act(() => result.current.selectTee("White"));
    expect(selected(result.current.teeChips)).toBe("White");

    act(() => result.current.selectTee("white"));
    expect(selected(result.current.teeChips)).toBeNull();
    expect(result.current.backNine.tee).toBeNull();
  });

  it("adds the golfer's hole averages once they have played the course", async () => {
    const repository = new FakeCoursesRepository();
    repository.analytics = halfMoonBayAnalytics;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.frontNine.holes[0]?.personalAverage).toBe(3.5));
  });
});
