import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { FakeCoursesRepository } from "@/testing/fakes/FakeCoursesRepository";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { FakeRoundsRepository } from "@/testing/fakes/FakeRoundsRepository";
import { FakeScanRepository, type FakeScanRepositorySeed } from "@/testing/fakes/FakeScanRepository";
import { pebbleBeach, pebbleBeachSummary } from "@/testing/fixtures/courses";
import { pebbleBeachCourse } from "@/testing/fixtures/roundDetails";
import { SCANNED_COURSE_NAME, scannedCard } from "@/testing/fixtures/scan";
import { ScanSessionProvider } from "../ScanSessionProvider";
import {
  useScanPageViewModel,
  type ScanPageRepositories,
  type ScanPageViewModel,
} from "../useScanPageViewModel";

function fakes(seed: FakeScanRepositorySeed = { result: scannedCard }) {
  const rounds = new FakeRoundsRepository();
  const scan = new FakeScanRepository({ store: rounds.store, ...seed });
  const courses = new FakeCoursesRepository([pebbleBeach]);
  courses.fullCourses = [pebbleBeachCourse];
  const repositories: ScanPageRepositories = { scan, courses, rounds };
  return { scan, courses, rounds, repositories };
}

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ScanSessionProvider>{children}</ScanSessionProvider>
      </QueryClientProvider>
    );
  };
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function renderVm(seed?: FakeScanRepositorySeed) {
  const doubles = fakes(seed);
  const view = renderHook(() => useScanPageViewModel("user-1", doubles.repositories), {
    wrapper: wrapperFor(newClient()),
  });
  return { ...doubles, ...view };
}

type Current = { current: ScanPageViewModel };

const photo = () => new File(["card"], "card.jpg", { type: "image/jpeg" });

async function pick(result: Current, file = photo()) {
  act(() => result.current.pickPhoto(file));
  await waitFor(() => expect(result.current.photo).toBe(file));
  return file;
}

async function scanToReview(result: Current) {
  await pick(result);
  act(() => result.current.extract());
  await waitFor(() => expect(result.current.step).toBe("review"));
}

describe("useScanPageViewModel", () => {
  it("starts on the upload step with nothing picked", () => {
    const { result } = renderVm();
    expect(result.current.step).toBe("upload");
    expect(result.current.mode).toBe("scan");
    expect(result.current.photo).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sends the photo, what's on the card, its text and the picked course with the scan", async () => {
    const { result, scan } = renderVm({ result: scannedCard, text: "HOLE 1 2 3" });
    act(() => result.current.pickPresetCourse(pebbleBeachSummary));
    const file = await pick(result);
    await waitFor(() => expect(scan.readPhotos).toEqual([file]));
    act(() => result.current.setCard({ name: "Sam", putts: true }));

    act(() => result.current.extract());

    await waitFor(() => expect(scan.extractRequests).toHaveLength(1));
    expect(scan.extractRequests[0]).toEqual({
      photo: file,
      userContext: "my name is Sam. name on score row. row order: score, putts",
      ocrText: "HOLE 1 2 3",
      courseId: pebbleBeachSummary.id,
    });
  });

  it("opens the review search on the name read off the card when a course was picked first", async () => {
    const { result } = renderVm();
    act(() => result.current.pickPresetCourse(pebbleBeachSummary));
    await pick(result);

    act(() => result.current.extract());

    await waitFor(() => expect(result.current.step).toBe("review"));
    expect(result.current.review.courseSearch.query).toBe(SCANNED_COURSE_NAME);
  });

  it("shows the scan in progress, then the card to check", async () => {
    const { result, scan } = renderVm({ result: scannedCard, holdExtract: true });
    await pick(result);

    act(() => result.current.extract());
    await waitFor(() => expect(result.current.step).toBe("processing"));
    expect(result.current.phase).toBe(0);

    act(() => scan.finishExtract());
    await waitFor(() => expect(result.current.step).toBe("review"));
    expect(result.current.review.round?.course?.name).toBe(SCANNED_COURSE_NAME);
    expect(result.current.review.round?.holes).toHaveLength(18);
    expect(result.current.review.teeBox).toBe("Blue");
  });

  it("keeps a running scan when the golfer leaves the page and comes back", async () => {
    const doubles = fakes({ result: scannedCard, holdExtract: true });
    const client = newClient();
    const Session = wrapperFor(client);
    // The provider stays mounted throughout, as it does above the app's routes; only the page
    // (the view model) unmounts while the golfer is away.
    let onPage = true;
    const { result, rerender } = renderHook(() => useScanPageViewModel("user-1", doubles.repositories), {
      wrapper: ({ children }) => <Session>{onPage ? children : null}</Session>,
    });
    await pick(result);
    act(() => result.current.extract());
    await waitFor(() => expect(result.current.step).toBe("processing"));

    onPage = false;
    rerender();
    act(() => doubles.scan.finishExtract());
    await waitFor(() => expect(client.isMutating()).toBe(0));
    onPage = true;
    rerender();

    await waitFor(() => expect(result.current.step).toBe("review"));
    expect(result.current.review.round?.course?.name).toBe(SCANNED_COURSE_NAME);
  });

  it("returns to the photo with the reason when the scan fails", async () => {
    const { result } = renderVm({ extractError: "We couldn't read that card." });
    const file = await pick(result);

    act(() => result.current.extract());

    await waitFor(() => expect(result.current.error).toBe("We couldn't read that card."));
    expect(result.current.step).toBe("upload");
    expect(result.current.photo).toBe(file);
  });

  it("clears the last failure when another photo is picked", async () => {
    const { result } = renderVm({ extractError: "We couldn't read that card." });
    await pick(result);
    act(() => result.current.extract());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await pick(result);

    expect(result.current.error).toBeNull();
  });

  it("does nothing on extract before a photo is picked", () => {
    const { result, scan } = renderVm();
    act(() => result.current.extract());
    expect(scan.extractRequests).toHaveLength(0);
    expect(result.current.step).toBe("upload");
  });

  it("switching to manual entry drops the photo and opens the setup", async () => {
    const { result } = renderVm();
    await pick(result);

    act(() => result.current.setMode("manual"));

    expect(result.current.step).toBe("setup");
    expect(result.current.photo).toBeNull();
  });

  it("offers the picked course's tees, and starts a blank card on that course", async () => {
    const { result } = renderVm();
    act(() => result.current.setMode("manual"));
    act(() => result.current.setup.pickCourse(pebbleBeachSummary));
    await waitFor(() => expect(result.current.setup.tees.map((tee) => tee.name)).toEqual(["Blue"]));
    act(() => result.current.setup.setTeeBox("Blue"));
    act(() => result.current.setup.setDate("2026-10-01"));

    act(() => result.current.setup.start());

    expect(result.current.step).toBe("review");
    const { review } = result.current;
    expect(review.linkedName).toBe(pebbleBeachSummary.name);
    expect(review.teeBox).toBe("Blue");
    expect(review.date).toBe("2026-10-01");
    expect(review.toCheck).toEqual([]);
    expect(review.round?.holes.every((hole) => hole.strokes === null)).toBe(true);
    expect(review.round?.holes.map((hole) => hole.par)).toEqual(pebbleBeachCourse.holes.map((hole) => hole.par));
  });

  it("starts eighteen unknown holes under a typed course name", () => {
    const { result } = renderVm();
    act(() => result.current.setMode("manual"));
    act(() => result.current.setup.nameCourse("Muni Nine"));

    act(() => result.current.setup.start());

    const { review } = result.current;
    expect(review.linkedName).toBeUndefined();
    expect(review.customName).toBe("Muni Nine");
    expect(review.round?.holes).toHaveLength(18);
  });

  it("saves the checked card and shows the round it became", async () => {
    const { result, scan } = renderVm();
    await scanToReview(result);
    act(() => result.current.review.setDate("2026-10-02"));

    act(() => result.current.review.save());

    await waitFor(() => expect(result.current.step).toBe("success"));
    await waitFor(() => expect(result.current.savedRound).not.toBeNull());
    const [sent] = scan.saveRequests;
    expect(sent.user_id).toBe("user-1");
    expect(sent.course_name).toBe(SCANNED_COURSE_NAME);
    expect(sent.date).toBe("2026-10-02");
    expect(sent.hole_scores.map((score) => score.strokes)).toEqual(
      scannedCard.round.hole_scores.map((score) => score.strokes),
    );
    expect(result.current.savedRound?.id).toMatch(/^scanned-/);
    expect(result.current.savedRound?.score).toBe(
      scannedCard.round.hole_scores.reduce((total, score) => total + (score.strokes ?? 0), 0),
    );
  });

  it("opening the saved round ends the scan", async () => {
    const { result } = renderVm();
    await scanToReview(result);
    act(() => result.current.review.save());
    await waitFor(() => expect(result.current.step).toBe("success"));
    const open = new FakeHandler<[string]>();

    act(() => result.current.openSavedRound(open.handle));

    expect(open.calls).toHaveLength(1);
    expect(open.calls[0][0]).toMatch(/^scanned-/);
    expect(result.current.step).toBe("upload");
    expect(result.current.review.round).toBeNull();
  });

  it("stays on the review with the reason when saving fails", async () => {
    const { result, rounds } = renderVm();
    rounds.store.saveError = "That round could not be saved.";
    await scanToReview(result);

    act(() => result.current.review.save());

    await waitFor(() => expect(result.current.review.error).toBe("That round could not be saved."));
    expect(result.current.step).toBe("review");
    expect(result.current.review.saving).toBe(false);
  });

  it("starting over drops the card, and a failed save with it", async () => {
    const { result, rounds } = renderVm();
    rounds.store.saveError = "That round could not be saved.";
    await scanToReview(result);
    act(() => result.current.review.save());
    await waitFor(() => expect(result.current.review.error).not.toBeNull());

    act(() => result.current.startOver());

    expect(result.current.step).toBe("upload");
    expect(result.current.review.round).toBeNull();
    expect(result.current.review.error).toBeNull();
    expect(result.current.photo).toBeNull();
  });
});
