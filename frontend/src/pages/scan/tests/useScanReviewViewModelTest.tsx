import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { useState, type ReactNode } from "react";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { FakeRoundsRepository } from "@/testing/fakes/FakeRoundsRepository";
import { FakeScanRepository } from "@/testing/fakes/FakeScanRepository";
import { pebbleBeach } from "@/testing/fixtures/courses";
import { pebbleBeachCourse } from "@/testing/fixtures/roundDetails";
import { SCANNED_COURSE_NAME, scannedCard, scannedTeeCard, UNSURE_HOLES, unsureCard } from "@/testing/fixtures/scan";
import type { ScanResult } from "@/types/scan";
import { reviewFromScan } from "../scanModel";
import { newScanSession, ScanSessionContext, type ScanSession } from "../scanSession";
import { useScanReviewViewModel, type ScanReviewRepositories } from "../useScanReviewViewModel";

const TODAY = "2026-10-15";

function renderReview(card: ScanResult = scannedCard, { handicapIndex = null as number | null } = {}) {
  const rounds = new FakeRoundsRepository({ handicapIndex });
  const scan = new FakeScanRepository({ store: rounds.store });
  const courses = new FakeCoursesRepository([pebbleBeach]);
  courses.fullCourses = [pebbleBeachCourse];
  const repositories: ScanReviewRepositories = { scan, courses, rounds };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sessions: ScanSession[] = [];

  function Wrapper({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<ScanSession>(() => ({
      ...newScanSession(TODAY),
      review: reviewFromScan(card, TODAY),
    }));
    sessions.push(session);
    return (
      <QueryClientProvider client={client}>
        <ScanSessionContext.Provider value={{ session, setSession }}>{children}</ScanSessionContext.Provider>
      </QueryClientProvider>
    );
  }

  const view = renderHook(() => useScanReviewViewModel("user-1", repositories), { wrapper: Wrapper });
  return { ...view, scan, rounds, courses, session: () => sessions[sessions.length - 1] };
}

const cardScore = scannedCard.round.hole_scores.reduce((total, score) => total + (score.strokes ?? 0), 0);

describe("useScanReviewViewModel", () => {
  it("reads the scanned card as a round, under the name read off it", () => {
    const { result } = renderReview();
    const { round } = result.current;
    expect(round?.course?.name).toBe(SCANNED_COURSE_NAME);
    expect(round?.score).toBe(cardScore);
    expect(round?.toPar).toBe(cardScore - scannedCard.round.course!.par!);
    expect(result.current.teeBox).toBe("Blue");
    expect(result.current.date).toBe(TODAY);
    expect(result.current.toCheck).toEqual([]);
  });

  it("marks the scores the scan wasn't sure of, until the golfer types over them", () => {
    const { result } = renderReview(unsureCard);
    expect(result.current.toCheck).toEqual(UNSURE_HOLES);

    act(() => result.current.setStrokes(4, 5));

    expect(result.current.toCheck).toEqual([11]);
    expect(result.current.round?.holes.find((hole) => hole.hole === 4)?.strokes).toBe(5);
  });

  it("previews typed strokes, putts and greens on the round", () => {
    const { result } = renderReview();
    act(() => result.current.setStrokes(1, 3));
    act(() => result.current.setPutts(1, 1));
    act(() => result.current.setGir(1, true));

    const hole = result.current.round?.holes[0];
    expect(hole).toMatchObject({ strokes: 3, putts: 1, gir: true, toPar: -1, kind: "birdie" });
    expect(result.current.round?.score).toBe(cardScore - 2);
  });

  it("links a picked course, reads the card against it, and offers its tees", async () => {
    const { result } = renderReview();

    act(() => result.current.pickCourse(pebbleBeach));

    expect(result.current.linkedName).toBe(pebbleBeach.name);
    expect(result.current.round?.course?.name).toBe(pebbleBeach.name);
    await waitFor(() => expect(result.current.tees).toEqual(["Blue"]));
    expect(result.current.round?.holes.map((hole) => hole.par)).toEqual(
      pebbleBeachCourse.holes.map((hole) => hole.par),
    );
  });

  it("refuses a provider's course with no provider id, and says why", () => {
    const { result } = renderReview();

    act(() =>
      result.current.pickCourse({ ...pebbleBeach, id: "external:1", source: "external", external_course_id: null }),
    );

    expect(result.current.error).toMatch(/missing provider ID/);
    expect(result.current.linkedName).toBeUndefined();
  });

  it("offers the card's name while picking, and keeps it without a link", () => {
    const { result } = renderReview();
    expect(result.current.nameToKeep).toBe(SCANNED_COURSE_NAME);

    act(() => result.current.nameCourse(result.current.nameToKeep!));

    expect(result.current.customName).toBe(SCANNED_COURSE_NAME);
    expect(result.current.nameToKeep).toBeNull();
  });

  it("changing a linked course reopens the search on its name", () => {
    const { result } = renderReview();
    act(() => result.current.pickCourse(pebbleBeach));

    act(() => result.current.changeCourse());

    expect(result.current.linkedName).toBeUndefined();
    expect(result.current.courseSearch.query).toBe(pebbleBeach.name);
  });

  it("works out the golfer's course handicap on a rated tee", () => {
    const teeCard: ScanResult = { ...scannedCard, round: scannedTeeCard };
    const { result } = renderReview(teeCard, { handicapIndex: 10 });
    // (10 × 133 / 113) + (73.4 − 72) = 13.17, rounded.
    return waitFor(() => expect(result.current.courseHandicap).toBe(13));
  });

  it("saves the card as edited, against the linked course, and ends the scan on the saved round", async () => {
    const { result, scan, session } = renderReview(unsureCard);
    act(() => result.current.setStrokes(4, 6));
    act(() => result.current.setTeeBox("White"));
    act(() => result.current.setDate("2026-10-02"));
    act(() => result.current.pickCourse(pebbleBeach));

    act(() => result.current.save());

    await waitFor(() => expect(session().savedRoundId).toMatch(/^scanned-/));
    const [sent] = scan.saveRequests;
    expect(sent.course_id).toBe(pebbleBeach.id);
    expect(sent.tee_box).toBe("White");
    expect(sent.date).toBe("2026-10-02");
    expect(sent.hole_scores.find((score) => score.hole_number === 4)?.strokes).toBe(6);
    expect(session().review).toBeNull();
  });

  it("saves under the typed name when no course is linked", async () => {
    const { result, scan, session } = renderReview();
    act(() => result.current.nameCourse("Muni Nine"));

    act(() => result.current.save());

    await waitFor(() => expect(session().savedRoundId).not.toBeNull());
    expect(scan.saveRequests[0].course_name).toBe("Muni Nine");
    expect(scan.saveRequests[0].course_id).toBeUndefined();
  });

  it("keeps the card and says why when saving fails, and forgets the failure on reset", async () => {
    const { result, rounds, session } = renderReview();
    rounds.store.saveError = "That round could not be saved.";

    act(() => result.current.save());

    await waitFor(() => expect(result.current.error).toBe("That round could not be saved."));
    expect(result.current.saving).toBe(false);
    expect(session().review).not.toBeNull();

    act(() => result.current.reset());
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});
