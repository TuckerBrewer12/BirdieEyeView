import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText } from "@/data/useCardText";
import { useExtractScorecard, useIsExtractingScorecard } from "@/data/useExtractScorecard";
import { useHandicapIndex } from "@/data/useHandicapIndex";
import type { RoundDetail } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/hooks/useCourseSearch";
import { messageFrom, USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { useCourse } from "../courses/useCourse";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";
import {
  courseQueryFrom,
  reviewCourseFrom,
  reviewFromScan,
  reviewFromSetup,
  saveRequestFrom,
  SCAN_PHASE_COUNT,
  SCAN_PHASE_HOLD_MS,
  todayIso,
  withGir,
  withScore,
  type ManualSetup,
  type ReviewDetails,
  type PickedCourse,
  type ScanMode,
  type ScanReviewDraft,
  type ScanStep,
  type ScoreField,
} from "./scanModel";
import { newScanSession, useScanSession } from "./scanSession";
import { useSaveScan } from "./useSaveScan";
import { useSavedRound } from "./useSavedRound";

export interface ScanPageRepositories {
  scan: ScanRepository;
  courses: CoursesRepository;
  rounds: Pick<RoundsRepository, "getRound" | "getUserHandicap">;
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
  /** Why the last scan, course pick or save failed. */
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
  /** Search over the golfer's saved courses, for the preset course and for manual entry. */
  courseSearch: CourseSearch;
  pickPresetCourse: (course: CourseSummary) => void;
  clearPresetCourse: () => void;

  // Processing
  /** Which phase of reading the card is showing, from 0 to `SCAN_PHASE_COUNT - 1`. */
  phase: number;

  // Setup, for typing scores in by hand
  setup: ManualSetup;
  /** The chosen course's tee colours, once it has loaded. */
  setupTees: string[];
  loadingSetupCourse: boolean;
  pickSetupCourse: (course: CourseSummary) => void;
  /** Uses a typed name for a course we don't have. */
  nameSetupCourse: (name: string) => void;
  clearSetupCourse: () => void;
  setSetupTeeBox: (teeBox: string) => void;
  setSetupDate: (date: string) => void;
  startEntry: () => void;

  // Review
  review: ScanReviewDraft | null;
  /** Search over saved and external courses, to link the round to. */
  reviewSearch: CourseSearch;
  pickReviewCourse: (course: CourseSummary) => void;
  /** The date, tee and course chosen for the round. */
  updateReview: (patch: Partial<ReviewDetails>) => void;
  changeScore: (index: number, field: ScoreField, value: string) => void;
  changeGir: (index: number, value: boolean | null) => void;
  handicapIndex: number | null;
  saving: boolean;
  save: () => void;

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
  const externalSearch = useMemo(
    () => ({ searchCourses: (query: string, user?: string) => courses.searchCourses(query, user, true) }),
    [courses],
  );
  const reviewSearch = useCourseSearch(userId, externalSearch);

  const cardText = useCardText(session.photo, scan);
  const { mutateAsync: extractCard } = useExtractScorecard(scan);
  const extracting = useIsExtractingScorecard();
  const { mutateAsync: saveScan, isPending: saving, error: saveError, reset: resetSave } =
    useSaveScan(userId, scan);
  const setupCourse = useCourse(session.setup.course?.id ?? undefined, courses);
  const savedRound = useSavedRound(session.savedRoundId, rounds);
  const handicapIndex = useHandicapIndex(userId, rounds);

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
  const { reset: resetReviewSearch, setQuery: setReviewQuery } = reviewSearch;

  const startOver = useCallback(() => {
    latestPick.current += 1;
    setSession(newScanSession());
    resetCourseSearch();
    resetReviewSearch();
    resetSave();
  }, [setSession, resetCourseSearch, resetReviewSearch, resetSave]);

  const setMode = useCallback(
    (mode: ScanMode) => {
      latestPick.current += 1;
      setSession((current) => ({ ...newScanSession(), mode, userContext: current.userContext }));
      resetCourseSearch();
    },
    [setSession, resetCourseSearch],
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

  const setSetup = useCallback(
    (patch: Partial<ManualSetup>) =>
      setSession((current) => ({ ...current, setup: { ...current.setup, ...patch } })),
    [setSession],
  );

  const pickSetupCourse = useCallback(
    (course: CourseSummary) => {
      setSetup({ course: { id: course.id, name: course.name ?? course.id }, teeBox: "" });
      resetCourseSearch();
    },
    [setSetup, resetCourseSearch],
  );

  const nameSetupCourse = useCallback(
    (name: string) => {
      setSetup({ course: { id: null, name }, teeBox: "" });
      resetCourseSearch();
    },
    [setSetup, resetCourseSearch],
  );

  const clearSetupCourse = useCallback(() => setSetup({ course: null, teeBox: "" }), [setSetup]);
  const setSetupTeeBox = useCallback((teeBox: string) => setSetup({ teeBox }), [setSetup]);
  const setSetupDate = useCallback((date: string) => setSetup({ date }), [setSetup]);

  const loadedSetupCourse = session.setup.course?.id ? (setupCourse.data ?? null) : null;
  const setupTees = useMemo(
    () => (loadedSetupCourse?.tees ?? []).flatMap((tee) => (tee.color ? [tee.color] : [])),
    [loadedSetupCourse],
  );

  const startEntry = useCallback(() => {
    setSession((current) => ({ ...current, review: reviewFromSetup(current.setup, loadedSetupCourse) }));
  }, [setSession, loadedSetupCourse]);

  const updateReview = useCallback(
    (patch: Partial<ReviewDetails>) =>
      setSession((current) => (current.review ? { ...current, review: { ...current.review, ...patch } } : current)),
    [setSession],
  );

  const pickReviewCourse = useCallback(
    (course: CourseSummary) => {
      const picked = reviewCourseFrom(course);
      if ("error" in picked) {
        setSession((current) => ({ ...current, error: picked.error }));
        return;
      }
      setSession((current) =>
        current.review ? { ...current, error: null, review: { ...current.review, ...picked.link } } : current,
      );
      resetReviewSearch();
    },
    [setSession, resetReviewSearch],
  );

  const changeScore = useCallback(
    (index: number, field: ScoreField, value: string) =>
      setSession((current) =>
        current.review ? { ...current, review: withScore(current.review, index, field, value) } : current,
      ),
    [setSession],
  );

  const changeGir = useCallback(
    (index: number, value: boolean | null) =>
      setSession((current) =>
        current.review ? { ...current, review: withGir(current.review, index, value) } : current,
      ),
    [setSession],
  );

  const save = useCallback(() => {
    const { review } = session;
    if (!review || saving) return;
    setSession((current) => ({ ...current, error: null }));
    saveScan(saveRequestFrom(userId, review))
      .then((roundId) => setSession({ ...newScanSession(), savedRoundId: roundId }))
      // The mutation holds the failure, and the review shows it.
      .catch(() => undefined);
  }, [session, saving, setSession, saveScan, userId]);

  const openSavedRound = useCallback(
    (open: (roundId: string) => void) => {
      const roundId = session.savedRoundId;
      if (!roundId) return;
      setSession(newScanSession());
      resetSave();
      open(roundId);
    },
    [session.savedRoundId, setSession, resetSave],
  );

  const failedSave = step === "review" && saveError ? messageFrom(saveError, USER_FACING_ERRORS.saveRound) : null;

  return {
    step,
    mode: session.mode,
    setMode,
    error: failedSave ?? session.error,
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

    phase,

    setup: session.setup,
    setupTees,
    loadingSetupCourse: setupCourse.isLoading,
    pickSetupCourse,
    nameSetupCourse,
    clearSetupCourse,
    setSetupTeeBox,
    setSetupDate,
    startEntry,

    review: session.review,
    reviewSearch,
    pickReviewCourse,
    updateReview,
    changeScore,
    changeGir,
    handicapIndex,
    saving,
    save,

    savedRound: savedRound.data ?? null,
    openSavedRound,
  };
}
