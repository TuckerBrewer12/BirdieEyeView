import { useCallback, useEffect, useRef, useState } from "react";
import { preparePhotoForUpload } from "@/data/photoUpload";
import { scanReportRepository, type ScanReportRepository } from "@/data/scanReportRepository";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { useCardText } from "@/data/useCardText";
import { useExtractScorecard, useIsExtractingScorecard } from "@/data/useExtractScorecard";
import { useFailedScanReport, type FailedScanReport } from "@/data/useFailedScanReport";
import type { RoundDetail } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/data/useCourseSearch";
import { failedScanAttempt, scanFailureOf } from "@/lib/scanReports";
import { messageFrom, USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/domain/course";
import { SCAN_STEPS, SCAN_STEP_HOLD_MS, cardContext, type CardFacts } from "@/domain/scan";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";
import {
  courseQueryFrom,
  reviewFromScan,
  todayIso,
  type PickedCourse,
  type ScanMode,
  type ScanStep,
} from "./scanModel";
import { newScanSession, useScanSession } from "./scanSession";
import { useSavedRound } from "./useSavedRound";
import { useScanReviewViewModel, type ScanReviewViewModel } from "./useScanReviewViewModel";
import { useScanSetupViewModel, type ScanSetupViewModel } from "./useScanSetupViewModel";

export interface ScanPageRepositories {
  scan: ScanRepository;
  courses: CoursesRepository;
  rounds: Pick<RoundsRepository, "getRound">;
  reports: ScanReportRepository;
}

const defaultRepositories: ScanPageRepositories = {
  scan: scanRepository,
  courses: coursesRepository,
  rounds: roundsRepository,
  reports: scanReportRepository,
};

export interface ScanPageViewModel {
  step: ScanStep;
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
  error: string | null;
  report: FailedScanReport;
  startOver: () => void;

  photo: File | null;
  pickPhoto: (photo: File) => void;
  card: CardFacts;
  setCard: (patch: Partial<CardFacts>) => void;
  extract: () => void;
  presetCourse: PickedCourse | null;
  courseSearch: CourseSearch;
  pickPresetCourse: (course: CourseSummary) => void;
  clearPresetCourse: () => void;

  phase: number;

  setup: ScanSetupViewModel;

  review: ScanReviewViewModel;

  savedRound: RoundDetail | null;
  scanAnother: () => void;
  openSavedRound: (open: (roundId: string) => void) => void;
}

export function useScanPageViewModel(
  userId: string,
  repositories: ScanPageRepositories = defaultRepositories,
): ScanPageViewModel {
  const { scan, courses, rounds, reports } = repositories;
  const { session, setSession } = useScanSession();
  const [phase, setPhase] = useState(0);
  const latestPick = useRef(0);

  const courseSearch = useCourseSearch(userId, courses);
  const setup = useScanSetupViewModel(userId, courses);
  const review = useScanReviewViewModel(userId, repositories);

  const cardText = useCardText(session.photo, scan);
  const { mutateAsync: extractCard } = useExtractScorecard(scan);
  const extracting = useIsExtractingScorecard();
  const savedRound = useSavedRound(session.savedRoundId, rounds);
  const report = useFailedScanReport(session.failedScan, reports);

  const step: ScanStep = session.savedRoundId
    ? "success"
    : session.review
      ? "review"
      : extracting
        ? "processing"
        : session.mode === "manual"
          ? "setup"
          : "upload";

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setInterval(
      () => setPhase((current) => Math.min(current + 1, SCAN_STEPS.length - 1)),
      SCAN_STEP_HOLD_MS,
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
      setSession((current) => ({ ...newScanSession(), mode, card: current.card }));
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
        setSession((current) => ({ ...current, photo: { id, file }, error: null, failedScan: null }));
      });
    },
    [setSession],
  );

  const setCard = useCallback(
    (patch: Partial<CardFacts>) => setSession((current) => ({ ...current, card: { ...current.card, ...patch } })),
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
    const { photo, card, presetCourse } = session;
    if (!photo) return;
    const stillPicked = (current: typeof session) => current.photo?.id === photo.id;
    setSession((current) => ({ ...current, error: null, failedScan: null }));
    extractCard({ photo: photo.file, userContext: cardContext(card), ocrText: cardText, courseId: presetCourse?.id ?? null })
      .then((result) => {
        setSession((current) =>
          stillPicked(current) ? { ...current, review: reviewFromScan(result, todayIso()) } : current,
        );
        if (presetCourse) setReviewQuery(courseQueryFrom(result.round.course?.name));
      })
      .catch((err: unknown) => {
        setSession((current) =>
          stillPicked(current)
            ? {
                ...current,
                error: messageFrom(err, USER_FACING_ERRORS.scan),
                failedScan: failedScanAttempt(photo.file, scanFailureOf(err)),
              }
            : current,
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
    report,
    startOver,

    photo: session.photo?.file ?? null,
    pickPhoto,
    card: session.card,
    setCard,
    extract,
    presetCourse: session.presetCourse,
    courseSearch,
    pickPresetCourse,
    clearPresetCourse,

    phase,

    setup,

    review,

    savedRound: savedRound.data ?? null,
    scanAnother: startOver,
    openSavedRound,
  };
}
