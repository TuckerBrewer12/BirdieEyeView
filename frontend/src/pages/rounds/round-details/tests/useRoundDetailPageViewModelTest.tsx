import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { pebbleBeach } from "@/testing/fixtures/courses";
import {
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

  it("live-totals a cleared hole in edit mode instead of falling back", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.editor.setScore(1, "strokes", null));
    expect(result.current.played?.score).toBe(73);
    expect(result.current.played?.holes.find((h) => h.hole === 1)?.strokes).toBeNull();
  });

  it("live-totals putts and greens edited in edit mode", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const frontPutts = result.current.played!.frontNine.putts!;
    expect(result.current.played).toMatchObject({ putts: 32, gir: 7 });
    act(() => result.current.enterEditMode());
    act(() => result.current.editor.setScore(1, "putts", 3));
    act(() => result.current.editor.setGir(1, false));
    expect(result.current.played).toMatchObject({ putts: 34, gir: 6 });
    expect(result.current.played?.frontNine.putts).toBe(frontPutts + 2);
  });

  it("reads yardage from a tee picked in edit mode", async () => {
    const { result } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.played?.yards).toBe(6500);
    act(() => result.current.enterEditMode());
    act(() => result.current.editor.setTeeBox("White"));
    expect(result.current.played?.yards).toBe(6100);
  });

  it("reads the round against a course picked in edit mode", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      fullCourses: [pebbleBeachCourse],
      handicapIndex: 10.4,
    });
    await waitFor(() => expect(result.current.courseHandicap).toBe(12));
    act(() => result.current.enterEditMode());
    await act(async () => {
      await result.current.editor.pickCourse(pebbleBeach);
    });
    expect(result.current.courseHandicap).toBe(16);
  });

  it("shows the saved round once a save lands", async () => {
    const { result, repository } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.editor.setScore(1, "strokes", 3));
    act(() => result.current.editor.save());
    await waitFor(() => expect(result.current.editor.editing).toBe(false));
    expect(result.current.played?.score).toBe(76);
    const saved = await repository.getRound("round-1");
    expect(saved.hole_scores.find((s) => s.hole_number === 1)?.strokes).toBe(3);
  });

  it("a failed save shows as the page's action error", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      updateError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.editor.save());
    await waitFor(() => expect(result.current.actionError).toBe("nope"));
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

  it("entering edit mode clears a failed delete's message", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      deleteError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.confirmDeleteRound(() => {}));
    await waitFor(() => expect(result.current.actionError).toBe("nope"));

    act(() => result.current.enterEditMode());
    expect(result.current.actionError).toBeNull();
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

  it("enter edit closes the view-mode link panel", async () => {
    const { result } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLinkCourse());
    expect(result.current.showLinkCourse).toBe(true);
    act(() => result.current.enterEditMode());
    expect(result.current.showLinkCourse).toBe(false);
    expect(result.current.editor.course).toEqual({ status: "custom", name: "Scanned Scorecard" });
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
