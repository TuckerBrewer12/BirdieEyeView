import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { useCourseScorecardViewModel } from "../components/useCourseScorecardViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(repository: FakeCoursesRepository) {
  return renderHook(() => useCourseScorecardViewModel("user-1", halfMoonBayCourse, repository), { wrapper });
}

const selected = (chips: { tee: { color: string | null }; selected: boolean }[]) =>
  chips.find((chip) => chip.selected)?.tee.color ?? null;

describe("useCourseScorecardViewModel", () => {
  it("works out the course handicap off each tee's slope and rating", async () => {
    const repository = new FakeCoursesRepository();
    repository.handicapIndex = 10.4;
    const { result } = renderVm(repository);
    await waitFor(() => expect(result.current.teeChips[0]?.courseHandicap).toBe(12));
    expect(result.current.teeChips[1]?.courseHandicap).toBe(9);
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
