import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { pebbleBeach } from "@/testing/fixtures/courses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  pebbleBeachCourse,
  scannedRound,
} from "@/testing/fixtures/roundDetails";
import {
  FakeRoundsRepository,
  type FakeRoundsRepositorySeed,
} from "@/testing/fakes/FakeRoundsRepository";
import type { Round } from "@/types/golf";
import { useRoundEditorViewModel } from "../useRoundEditorViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** The editor is handed its round, so there is nothing to load first. */
function renderEditor(roundId: string, round: Round, seed: FakeRoundsRepositorySeed = {}) {
  const repository = new FakeRoundsRepository({ detailRounds: [round], ...seed });
  const hook = renderHook(
    () => useRoundEditorViewModel("user-1", roundId, round, repository),
    { wrapper },
  );
  return { ...hook, repository };
}

describe("useRoundEditorViewModel", () => {
  it("starts on the round's own course and tees, without fetching the course again", () => {
    const { result } = renderEditor("round-1", halfMoonBayRound);
    act(() => result.current.start());
    expect(result.current.editing).toBe(true);
    expect(result.current.course).toEqual({ status: "linked", course: halfMoonBayCourse });
    expect(result.current.linkedName).toBe("Half Moon Bay");
    expect(result.current.availableTees).toEqual(["Blue", "White"]);
  });

  it("a failed save says why and stays in edit mode", async () => {
    const { result } = renderEditor("round-1", halfMoonBayRound, { updateError: "nope" });
    act(() => result.current.start());
    act(() => result.current.save());
    await waitFor(() => expect(result.current.error).toBe("nope"));
    expect(result.current.saving).toBe(false);
    expect(result.current.editing).toBe(true);
  });

  it("cancelling clears a failed save's message", async () => {
    const { result } = renderEditor("round-1", halfMoonBayRound, { updateError: "nope" });
    act(() => result.current.start());
    act(() => result.current.save());
    await waitFor(() => expect(result.current.error).toBe("nope"));

    act(() => result.current.cancel());
    expect(result.current.error).toBeNull();
    expect(result.current.editing).toBe(false);
  });

  it("changing course on a linked round goes back to picking", () => {
    const { result } = renderEditor("round-1", halfMoonBayRound);
    act(() => result.current.start());
    act(() => result.current.changeCourse());
    expect(result.current.course).toEqual({ status: "picking" });
    expect(result.current.linkedName).toBeUndefined();
    expect(result.current.availableTees).toEqual(["Blue", "White"]);
  });

  it("picking a course links that course and matches a compatible tee", async () => {
    const { result } = renderEditor("round-1", halfMoonBayRound, { fullCourses: [pebbleBeachCourse] });
    act(() => result.current.start());
    await act(async () => {
      await result.current.pickCourse(pebbleBeach);
    });
    expect(result.current.course.status).toBe("linked");
    expect(result.current.linkedName).toBe("Pebble Beach");
    expect(result.current.teeBox).toBe("Blue");
    expect(result.current.activeCourse?.name).toBe("Pebble Beach");
  });

  it("a course that will not load says why", async () => {
    const { result } = renderEditor("round-1", halfMoonBayRound);
    act(() => result.current.start());
    await act(async () => {
      await result.current.pickCourse(pebbleBeach);
    });
    expect(result.current.error).not.toBeNull();
    expect(result.current.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("closing the course search puts back the round's own course", async () => {
    const { result } = renderEditor("round-1", halfMoonBayRound, { fullCourses: [pebbleBeachCourse] });
    act(() => result.current.start());
    await act(async () => {
      await result.current.pickCourse(pebbleBeach);
    });
    act(() => result.current.closeCourseSearch());
    expect(result.current.course).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("saving a newly picked course links it and clears the played name", async () => {
    const { result, repository } = renderEditor("round-4", scannedRound, { fullCourses: [pebbleBeachCourse] });
    act(() => result.current.start());
    await act(async () => {
      await result.current.pickCourse(pebbleBeach);
    });
    act(() => result.current.save());
    await waitFor(() => expect(result.current.editing).toBe(false));
    const saved = await repository.getRound("round-4");
    expect(saved.course?.id).toBe("course-pebble");
    expect(saved.course_name_played).toBeNull();
  });

  it("offers to keep the played name while picking, and saving keeps it", async () => {
    const { result, repository } = renderEditor("round-4", scannedRound);
    act(() => result.current.start());
    act(() => result.current.changeCourse());
    expect(result.current.playedNameToKeep).toBe("Scanned Scorecard");

    act(() => result.current.keepPlayedName());
    expect(result.current.course).toEqual({ status: "custom", name: "Scanned Scorecard" });
    expect(result.current.playedNameToKeep).toBeNull();

    act(() => result.current.save());
    await waitFor(() => expect(result.current.editing).toBe(false));
    const saved = await repository.getRound("round-4");
    expect(saved.course_name_played).toBe("Scanned Scorecard");
    expect(saved.course).toBeNull();
  });

  it("does not offer the played name while a search is typed", () => {
    const { result } = renderEditor("round-4", scannedRound);
    act(() => result.current.start());
    act(() => result.current.changeCourse());
    act(() => result.current.searchCourses("Tor"));
    expect(result.current.playedNameToKeep).toBeNull();
  });
});
