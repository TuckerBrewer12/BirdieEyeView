import { useCallback, useEffect, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText } from "@/data/useCardText";
import { useExtractScorecard, useIsExtractingScorecard } from "@/data/useExtractScorecard";
import type { RoundDetail } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/data/useCourseSearch";
import { messageFrom, USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/domain/course";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";
import {
  courseQueryFrom,
  reviewFromScan,
  SCAN_PHASE_COUNT,
  SCAN_PHASE_HOLD_MS,
  todayIso,
  type PickedCourse,
  type ScanMode,
  type ScanStep,
} from "./scanModel";
import { newScanSession, useScanSession, withArrivingCourse } from "./scanSession";
import { useSavedRound } from "./useSavedRound";
import { useScanReviewViewModel, type ScanReviewViewModel } from "./useScanReviewViewModel";
import { useScanSetupViewModel, type ScanSetupViewModel } from "./useScanSetupViewModel";

export interface ScanPageRepositories {
  scan: ScanRepository;
  courses: CoursesRepository;
  rounds: Pick<RoundsRepository, "getRound">;
}

const defaultRepositories: ScanPageRepositories = {
  scan: scanRepository,
  courses: coursesRepository,
  rounds: roundsRepository,
};

export interface ScanPageViewModel {
  step: ScanStep;
  mode: ScanMode;
  /** Switching starts the card over: a photo or course picked for one mode doesn't carry. */
  setMode: (mode: ScanMode) => void;
  /** Why the last scan failed. */
  error: string | null;
  startOver: () => void;

  // Upload
  /** The picked photo, readied for upload. */
  photo: File | null;
  pickPhoto: (photo: File) => void;
  clearPhoto: () => void;
  setUserContext: (context: string) => void;
  extract: () => void;
  /** A saved course to read the card against, picked before scanning. */
  presetCourse: PickedCourse | null;
  /** Search over the golfer's saved courses, for the preset course. */
  courseSearch: CourseSearch;
  pickPresetCourse: (course: CourseSummary) => void;
  clearPresetCourse: () => void;
  /**
   * Arriving from a page that sent a course along (a course's "Scan a round"): picks it ahead
   * unless a card is already under way, which the golfer comes back to as it was.
   */
  arriveWithCourse: (course: PickedCourse) => void;

  // Processing
  /** Which phase of reading the card is showing, from 0 to `SCAN_PHASE_COUNT - 1`. */
  phase: number;

  // Setup
  /** Choosing the course, tee and date before typing scores in by hand. */
  setup: ScanSetupViewModel;

  // Review
  /** Checking the card, once there is one. */
  review: ScanReviewViewModel;

  // Success
  /** The round as saved, once it has loaded. */
  savedRound: RoundDetail | null;
  /** Ends the scan and hands the saved round's id to `open`. */
  openSavedRound: (open: (roundId: string) => void) => void;
}

/**
 * The scan screen's step machine: upload → processing → review → success, or setup → review
 * for typing scores in by hand. The card being worked on lives in the app-wide scan session,
 * so it survives leaving the page; searches and the processing phase start fresh each visit.
 */
export function useScanPageViewModel(
  userId: string,
  repositories: ScanPageRepositories = defaultRepositories,
): ScanPageViewModel {
  const { scan, courses, rounds } = repositories;
  const { session, setSession } = useScanSession();
  const [phase, setPhase] = useState(0);
  // A later pick wins over an earlier one still being readied.
  const latestPick = useRef(0);

  const courseSearch = useCourseSearch(userId, courses);
  const setup = useScanSetupViewModel(userId, courses);
  const review = useScanReviewViewModel(userId, repositories);

  const cardText = useCardText(session.photo, scan);
  const { mutateAsync: extractCard } = useExtractScorecard(scan);
  const extracting = useIsExtractingScorecard();
  const savedRound = useSavedRound(session.savedRoundId, rounds);

  const step: ScanStep = session.savedRoundId
    ? "success"
    : session.review
      ? "review"
      : extracting
        ? "processing"
        : session.mode === "manual"
          ? "setup"
          : "upload";

  // Restarting at zero each time keeps a second scan from opening on the last phase.
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, SCAN_PHASE_COUNT - 1)),
      SCAN_PHASE_HOLD_MS,
    );
    return () => {
      clearInterval(timer);
      setPhase(0);
    };
  }, [step]);

  const { reset: resetCourseSearch } = courseSearch;
  const { reset: resetSetup } = setup;
  const { reset: resetReview } = review;
  const { setQuery: setReviewQuery } = review.courseSearch;

  const startOver = useCallback(() => {
    latestPick.current += 1;
    setSession(newScanSession());
    resetCourseSearch();
    resetSetup();
    resetReview();
  }, [setSession, resetCourseSearch, resetSetup, resetReview]);

  const setMode = useCallback(
    (mode: ScanMode) => {
      latestPick.current += 1;
      setSession((current) => ({ ...newScanSession(), mode, userContext: current.userContext }));
      resetCourseSearch();
      resetSetup();
    },
    [setSession, resetCourseSearch, resetSetup],
  );

  const pickPhoto = useCallback(
    (picked: File) => {
      const pick = ++latestPick.current;
      void preparePhotoForUpload(picked).then((file) => {
        if (pick !== latestPick.current) return;
        const id = `${file.name}-${file.size}-${Date.now()}`;
        setSession((current) => ({ ...current, photo: { id, file }, error: null }));
      });
    },
    [setSession],
  );

  const clearPhoto = useCallback(() => {
    latestPick.current += 1;
    setSession((current) => ({ ...current, photo: null, error: null }));
  }, [setSession]);

  const setUserContext = useCallback(
    (userContext: string) => setSession((current) => ({ ...current, userContext })),
    [setSession],
  );

  const pickPresetCourse = useCallback(
    (course: CourseSummary) => {
      setSession((current) => ({ ...current, presetCourse: { id: course.id, name: course.name ?? course.id } }));
      resetCourseSearch();
    },
    [setSession, resetCourseSearch],
  );

  const clearPresetCourse = useCallback(
    () => setSession((current) => ({ ...current, presetCourse: null })),
    [setSession],
  );

  const arriveWithCourse = useCallback(
    (course: PickedCourse) => setSession((current) => withArrivingCourse(current, course)),
    [setSession],
  );

  const extract = useCallback(() => {
    const { photo, userContext, presetCourse } = session;
    if (!photo) return;
    // Only the scan of the photo still picked may land, so starting over mid-scan sticks.
    const stillPicked = (current: typeof session) => current.photo?.id === photo.id;
    setSession((current) => ({ ...current, error: null }));
    extractCard({ photo: photo.file, userContext, ocrText: cardText, courseId: presetCourse?.id ?? null })
      .then((result) => {
        setSession((current) =>
          stillPicked(current) ? { ...current, review: reviewFromScan(result, todayIso()) } : current,
        );
        // With a course picked up front, the review offers the matches for the name read off
        // the card. Without one, a noisy name is better left out of the search.
        if (presetCourse) setReviewQuery(courseQueryFrom(result.round.course?.name));
      })
      .catch((err: unknown) => {
        setSession((current) =>
          stillPicked(current) ? { ...current, error: messageFrom(err, USER_FACING_ERRORS.scan) } : current,
        );
      });
  }, [session, setSession, extractCard, cardText, setReviewQuery]);

  const openSavedRound = useCallback(
    (open: (roundId: string) => void) => {
      const roundId = session.savedRoundId;
      if (!roundId) return;
      setSession(newScanSession());
      resetReview();
      open(roundId);
    },
    [session.savedRoundId, setSession, resetReview],
  );

  return {
    step,
    mode: session.mode,
    setMode,
    error: session.error,
    startOver,

    photo: session.photo?.file ?? null,
    pickPhoto,
    clearPhoto,
    setUserContext,
    extract,
    presetCourse: session.presetCourse,
    courseSearch,
    pickPresetCourse,
    clearPresetCourse,
    arriveWithCourse,

    phase,

    setup,

    review,

    savedRound: savedRound.data ?? null,
    openSavedRound,
  };
}
