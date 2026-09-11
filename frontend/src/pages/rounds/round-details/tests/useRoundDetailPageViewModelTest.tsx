import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import type { RoundComparison } from "@/types/analytics";
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

function row(label: string, value: number) {
  return { label, sample_size: 4, round_id: "round-1", primary_value: value, secondary_value: null };
}

const sampleComparison: RoundComparison = {
  score: [row("This round", 78)],
  putts: [row("This round", 32)],
  gir: [row("This round", 7)],
  three_putts: [row("This round", 2)],
  putts_per_gir: [row("This round", 1.8)],
  scrambling: [row("This round", 3)],
};

describe("useRoundDetailPageViewModel", () => {
  it("exposes the loaded round's name, score, and to-par", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseName).toBe("Half Moon Bay");
    expect(result.current.totalScore).toBe(78);
    expect(result.current.toPar).toBe(6);
    expect(result.current.showLinkButton).toBe(false);
    expect(result.current.showMomentum).toBe(true);
  });

  it("computes net score from handicap and the active tee", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      handicapIndex: 10.4,
    });
    await waitFor(() => expect(result.current.netScore).toBe(66));
    expect(result.current.courseHandicap).toBe(12);
  });

  it("shows the link button when the round has no course", async () => {
    const { result } = renderVm("round-4", { detailRounds: [scannedRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showLinkButton).toBe(true);
    expect(result.current.courseName).toBe("Scanned Scorecard");
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
    expect(result.current.totalScore).toBe(73);
  });

  it("saves edited strokes and leaves edit mode", async () => {
    const { result, repository } = renderVm("round-1", { detailRounds: [halfMoonBayRound] });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.enterEditMode());
    act(() => result.current.handleScoreChange(1, "strokes", 3));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.editMode).toBe(false);
    expect(result.current.totalScore).toBe(76);
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
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.actionError).toBe("nope");
    expect(result.current.editMode).toBe(true);
  });

  it("delete records the round on the repository", async () => {
    const { result, repository } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.requestDelete());
    expect(result.current.confirmDelete).toBe(true);
    let ok = false;
    await act(async () => {
      ok = await result.current.confirmDeleteRound();
    });
    expect(ok).toBe(true);
    expect(repository.deletedIds).toEqual(["round-1"]);
  });

  it("a failed delete sets actionError and does not report success", async () => {
    const { result, repository } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      deleteError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => {
      ok = await result.current.confirmDeleteRound();
    });
    expect(ok).toBe(false);
    expect(result.current.actionError).toBe("nope");
    expect(repository.deletedIds).toEqual([]);
  });

  it("linking a course closes the panel", async () => {
    const { result, repository } = renderVm("round-4", {
      detailRounds: [scannedRound],
      courses: [pebbleBeach],
      fullCourses: [pebbleBeachCourse],
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLinkCourse());
    expect(result.current.showLinkCourse).toBe(true);

    await act(async () => {
      await result.current.handleSelectCourse(pebbleBeach);
    });
    expect(result.current.showLinkCourse).toBe(false);
    const linked = await repository.getRound("round-4");
    expect(linked.course?.name).toBe("Pebble Beach");
  });

  it("a failed link sets actionError and leaves the panel open", async () => {
    const { result } = renderVm("round-4", {
      detailRounds: [scannedRound],
      courses: [pebbleBeach],
      linkError: "nope",
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.openLinkCourse());
    await act(async () => {
      await result.current.handleSelectCourse(pebbleBeach);
    });
    expect(result.current.actionError).toBe("nope");
    expect(result.current.showLinkCourse).toBe(true);
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
    await waitFor(() => expect(result.current.netScore).toBe(66));
    act(() => result.current.enterEditMode());
    await act(async () => {
      await result.current.handleSelectEditCourse(pebbleBeach);
    });
    expect(result.current.courseEdit.status).toBe("linked");
    expect(result.current.editLinkedName).toBe("Pebble Beach");
    expect(result.current.editedTeeBox).toBe("Blue");
    expect(result.current.courseHandicap).toBe(16);
    expect(result.current.netScore).toBe(62);
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
    await act(async () => {
      await result.current.save();
    });
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
    await act(async () => {
      await result.current.save();
    });
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

  it("exposes finished comparison charts and Score as the active tab", async () => {
    const { result } = renderVm("round-1", {
      detailRounds: [halfMoonBayRound],
      comparison: sampleComparison,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showComparison).toBe(true);
    expect(result.current.charts.map((c) => c.title)).toEqual([
      "Score",
      "Putts",
      "GIR",
      "3-Putts",
      "Putts per GIR",
      "Scrambling",
    ]);
    expect(result.current.chartTab).toBe("score");
    expect(result.current.chartTabs).toEqual([
      { key: "score", label: "Score", active: true },
      { key: "short_game", label: "Short Game", active: false },
      { key: "gir", label: "GIR", active: false },
    ]);
    expect(result.current.selectedCharts.map((c) => c.title)).toEqual(["Score"]);

    act(() => result.current.selectChartTab("short_game"));
    expect(result.current.chartTab).toBe("short_game");
    expect(result.current.selectedCharts.map((c) => c.title)).toEqual([
      "Putts",
      "3-Putts",
      "Putts per GIR",
      "Scrambling",
    ]);
  });
});
