import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { useState, type ReactNode } from "react";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { pebbleBeach, pebbleBeachSummary } from "@/testing/fixtures/courses";
import { pebbleBeachCourse } from "@/testing/fixtures/roundDetails";
import { newScanSession, ScanSessionContext, type ScanSession } from "../scanSession";
import { useScanSetupViewModel } from "../useScanSetupViewModel";

const TODAY = "2026-10-15";

function renderSetup() {
  const courses = new FakeCoursesRepository([pebbleBeach]);
  courses.fullCourses = [pebbleBeachCourse];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sessions: ScanSession[] = [];

  function Wrapper({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<ScanSession>(() => ({ ...newScanSession(TODAY), mode: "manual" }));
    sessions.push(session);
    return (
      <QueryClientProvider client={client}>
        <ScanSessionContext.Provider value={{ session, setSession }}>{children}</ScanSessionContext.Provider>
      </QueryClientProvider>
    );
  }

  const view = renderHook(() => useScanSetupViewModel("user-1", courses), { wrapper: Wrapper });
  return { ...view, courses, session: () => sessions[sessions.length - 1] };
}

describe("useScanSetupViewModel", () => {
  it("starts with no course, no tee and today's date", () => {
    const { result } = renderSetup();
    expect(result.current.linkedName).toBeUndefined();
    expect(result.current.customName).toBeUndefined();
    expect(result.current.tees).toEqual([]);
    expect(result.current.teeBox).toBe("");
    expect(result.current.date).toBe(TODAY);
  });

  it("finds the golfer's saved courses by name", async () => {
    const { result, courses } = renderSetup();

    act(() => result.current.courseSearch.setQuery("Pebble"));

    await waitFor(() => expect(result.current.courseSearch.results).toEqual([pebbleBeachSummary]));
    expect(courses.searchQueries).toEqual(["Pebble"]);
  });

  it("offers a picked course's tees once it has loaded", async () => {
    const { result } = renderSetup();

    act(() => result.current.pickCourse(pebbleBeachSummary));

    expect(result.current.linkedName).toBe(pebbleBeachSummary.name);
    expect(result.current.loadingTees).toBe(true);
    await waitFor(() => expect(result.current.tees.map((tee) => tee.name)).toEqual(["Blue"]));
    expect(result.current.loadingTees).toBe(false);
    act(() => result.current.setTeeBox("Blue"));
    expect(result.current.teeBox).toBe("Blue");
  });

  it("keeps a typed name for a course we don't have, with the tee typed in", () => {
    const { result } = renderSetup();

    act(() => result.current.nameCourse("Muni Nine"));
    act(() => result.current.setTeeBox("Gold"));

    expect(result.current.customName).toBe("Muni Nine");
    expect(result.current.linkedName).toBeUndefined();
    expect(result.current.tees).toEqual([]);
    expect(result.current.loadingTees).toBe(false);
    expect(result.current.teeBox).toBe("Gold");
  });

  it("changing a typed name opens the search on it", () => {
    const { result } = renderSetup();
    act(() => result.current.nameCourse("Muni Nine"));

    act(() => result.current.clearCourse());

    expect(result.current.customName).toBeUndefined();
    expect(result.current.courseSearch.query).toBe("Muni Nine");
  });

  it("changing a picked course drops its tee and opens an empty search", async () => {
    const { result } = renderSetup();
    act(() => result.current.pickCourse(pebbleBeachSummary));
    await waitFor(() => expect(result.current.tees.map((tee) => tee.name)).toEqual(["Blue"]));
    act(() => result.current.setTeeBox("Blue"));

    act(() => result.current.clearCourse());

    expect(result.current.linkedName).toBeUndefined();
    expect(result.current.teeBox).toBe("");
    expect(result.current.tees).toEqual([]);
    expect(result.current.courseSearch.query).toBe("");
  });

  it("starts a blank card under the typed name, tee and date", () => {
    const { result, session } = renderSetup();
    act(() => result.current.nameCourse("Muni Nine"));
    act(() => result.current.setTeeBox("Gold"));
    act(() => result.current.setDate("2026-10-01"));

    act(() => result.current.start());

    const review = session().review;
    expect(review?.course).toEqual({ status: "named", name: "Muni Nine" });
    expect(review?.teeBox).toBe("Gold");
    expect(review?.date).toBe("2026-10-01");
    expect(review?.scan.round.hole_scores).toHaveLength(18);
    expect(review?.scan.round.hole_scores.every((score) => score.strokes === null)).toBe(true);
  });

  it("starts a card on the picked course's holes, linked to it", async () => {
    const { result, session } = renderSetup();
    act(() => result.current.pickCourse(pebbleBeachSummary));
    await waitFor(() => expect(result.current.tees.map((tee) => tee.name)).toEqual(["Blue"]));

    act(() => result.current.start());

    const review = session().review;
    expect(review?.course).toMatchObject({ status: "linked", id: pebbleBeachSummary.id });
    expect(review?.scan.round.course?.holes.map((hole) => hole.par)).toEqual(
      pebbleBeachCourse.holes.map((hole) => hole.par),
    );
  });
});
