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
import { useRoundDetailPageViewModel } from "../useRoundDetailPageViewModel";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderVm(
  roundId: string,
  seed: FakeRoundsRepositorySeed,
) {
  const repository = new FakeRoundsRepository(seed);
  const hook = renderHook(
    () => useRoundDetailPageViewModel("user-1", roundId, repository),
    { wrapper },
  );
  return { ...hook, repository };
}

describe("useRoundDetailPageViewModel", () => {
  it("exposes the loaded round's name, score, and to-par", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseName).toBe("Half Moon Bay");
    expect(result.current.played?.score).toBe(78);
    expect(result.current.played?.toPar).toBe(6);
    expect(result.current.teeRating).toBe("72.4 / 130");
    expect(result.current.showLinkButton).toBe(false);
    expect(result.current.showMomentum).toBe(true);
  });

  it("computes the course handicap from the index and the active tee", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      handicapIndex: 10.4,
    });
    await waitFor(() => expect(result.current.courseHandicap).toBe(12));
  });

  it("shows the link button when the round has no course", async () => {
    const { result } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showLinkButton).toBe(true);
    expect(result.current.courseName).toBe("Scanned Scorecard");
    expect(result.current.teeRating).toBeNull();
  });

  it("enter edit uses the round's tees and does not need a second course fetch", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    expect(result.current.editMode).toBe(true);
    expect(result.current.courseEdit).toEqual({ status: "linked", course: halfMoonBayCourse });
    expect(result.current.availableTees).toEqual(["Blue", "White"]);
  });

  it("live-totals a cleared hole in edit mode instead of falling back", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.handleScoreChange(1, "strokes", null));
    expect(result.current.played?.score).toBe(73);
    expect(result.current.played?.holes.find((h) => h.hole === 1)?.strokes).toBeNull();
  });

  it("saves edited strokes and leaves edit mode", async () => {
    const { result, repository } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.handleScoreChange(1, "strokes", 3));
    act(() => result.current.save());
    await waitFor(() => expect(result.current.editMode).toBe(false));
    expect(result.current.played?.score).toBe(76);
    const saved = await repository.getRound("round-1");
    expect(saved.hole_scores.find((s) => s.hole_number === 1)?.strokes).toBe(3);
  });

  it("a failed save sets actionError and stays in edit mode", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      updateError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.save());
    await waitFor(() => expect(result.current.actionError).toBe("nope"));
    expect(result.current.saving).toBe(false);
    expect(result.current.editMode).toBe(true);
  });

  it("delete records the round on the repository", async () => {
    const { result, repository } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.requestDelete());
    expect(result.current.confirmDelete).toBe(true);
    let deleted = false;
    act(() => result.current.confirmDeleteRound(() => { deleted = true; }));
    await waitFor(() => expect(deleted).toBe(true));
    expect(repository.deletedIds).toEqual(["round-1"]);
  });

  it("a failed delete sets actionError and does not report success", async () => {
    const { result, repository } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      deleteError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let deleted = false;
    act(() => result.current.confirmDeleteRound(() => { deleted = true; }));
    await waitFor(() => expect(result.current.actionError).toBe("nope"));
    expect(deleted).toBe(false);
    expect(repository.deletedIds).toEqual([]);
  });

  it("opening the link panel hides the link button until it closes", async () => {
    const { result } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLinkCourse());
    expect(result.current.showLinkCourse).toBe(true);
    expect(result.current.showLinkButton).toBe(false);

    act(() => result.current.closeLinkCourse());
    expect(result.current.showLinkCourse).toBe(false);
    expect(result.current.showLinkButton).toBe(true);
  });

  it("a failed save's message clears when the golfer tries to delete", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      updateError: "save broke",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.save());
    await waitFor(() => expect(result.current.actionError).toBe("save broke"));

    act(() => result.current.cancelEdit());
    act(() => result.current.confirmDeleteRound(() => {}));
    expect(result.current.actionError).toBeNull();
  });

  it("enter edit closes the view-mode link panel", async () => {
    const { result } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLinkCourse());
    expect(result.current.showLinkCourse).toBe(true);
    act(() => result.current.enterEditMode());
    expect(result.current.showLinkCourse).toBe(false);
    expect(result.current.courseEdit).toEqual({ status: "custom", name: "Scanned Scorecard" });
  });

  it("startChangingCourse moves a linked round to picking", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.startChangingCourse());
    expect(result.current.courseEdit).toEqual({ status: "picking" });
    expect(result.current.editLinkedName).toBeUndefined();
    expect(result.current.availableTees).toEqual(["Blue", "White"]);
  });

  it("picking a course links that Course and matches a compatible tee", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      fullCourses: [pebbleBeachCourse],
      handicapIndex: 10.4,
    });
    await waitFor(() => expect(result.current.courseHandicap).toBe(12));
    act(() => result.current.enterEditMode());
    await act(async () => {
      await result.current.handleSelectEditCourse(pebbleBeach);
    });
    expect(result.current.courseEdit.status).toBe("linked");
    expect(result.current.editLinkedName).toBe("Pebble Beach");
    expect(result.current.editedTeeBox).toBe("Blue");
    expect(result.current.courseHandicap).toBe(16);
  });

  it("saving a newly picked course links it and clears a custom name", async () => {
    const { result, repository } = renderVm("round-4", {
      detailRounds: [scannedRound],
      fullCourses: [pebbleBeachCourse],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    await act(async () => {
      await result.current.handleSelectEditCourse(pebbleBeach);
    });
    act(() => result.current.save());
    await waitFor(() => expect(result.current.editMode).toBe(false));
    const saved = await repository.getRound("round-4");
    expect(saved.course?.id).toBe("course-pebble");
    expect(saved.course_name_played).toBeNull();
  });

  it("keepUnlinkedName is keep-played-name, and save writes that override", async () => {
    const { result, repository } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.startChangingCourse());
    expect(result.current.keepUnlinkedNameLabel).toBe(
      'Keep "Scanned Scorecard" without linking →',
    );
    act(() => result.current.keepUnlinkedName());
    expect(result.current.courseEdit).toEqual({ status: "custom", name: "Scanned Scorecard" });
    expect(result.current.keepUnlinkedNameLabel).toBeNull();
    act(() => result.current.save());
    await waitFor(() => expect(result.current.editMode).toBe(false));
    const saved = await repository.getRound("round-4");
    expect(saved.course_name_played).toBe("Scanned Scorecard");
    expect(saved.course).toBeNull();
  });

  it("closeEditCourseSearch restores the round's original course edit", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      fullCourses: [pebbleBeachCourse],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    await act(async () => {
      await result.current.handleSelectEditCourse(pebbleBeach);
    });
    act(() => result.current.closeEditCourseSearch());
    expect(result.current.courseEdit).toEqual({ status: "linked", course: halfMoonBayCourse });
  });

  it("a missing round is an error, not a spinner", async () => {
    const { result } = renderVm("missing", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.round).toBeUndefined();
    expect(result.current.loadError).toBe("Round not found.");
  });

  it("totals each nine from the round's one list of holes", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.played?.holes).toHaveLength(18);
    expect(result.current.played?.frontNine.total).toBe(40);
    expect(result.current.played?.backNine.total).toBe(38);
  });

  it("withholds a nine's total until all nine holes are played", async () => {
    const partial = {
      ...halfMoonBayRound,
      hole_scores: halfMoonBayRound.hole_scores.slice(0, 5),
    };
    const { result } = renderVm("round-1", { detailRounds: [partial] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Bars still draw, but a part-played nine reports no total — the same rule
    // the round-list query uses, so the two screens cannot disagree.
    expect(result.current.played?.frontNine.holes).toHaveLength(5);
    expect(result.current.played?.frontNine.total).toBeNull();
    expect(result.current.played?.backNine.holes).toHaveLength(0);
  });

  it("buckets every hole into a score count", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.played?.scoreCounts).toEqual({
      eagle: 0, birdie: 1, par: 10, bogey: 7, double: 0, triple: 0, quad: 0,
    });
  });
});
