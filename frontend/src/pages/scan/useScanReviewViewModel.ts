import { useCallback, useMemo, useState } from "react";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import { strokesToCheck, teeOptions, type Round, type TeeChoice } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/data/useCourseSearch";
import { messageFrom, USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/domain/course";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { useCourse } from "../courses/useCourse";
import {
  reviewCourseFrom,
  reviewedRound,
  saveRequestFrom,
  scannedTeeOptions,
  todayIso,
  withHoleEdit,
  type ScanReviewDraft,
} from "./scanModel";
import { newScanSession, useScanSession } from "./scanSession";
import { useSaveScan } from "./useSaveScan";

export interface ScanReviewRepositories {
  scan: ScanRepository;
  courses: CoursesRepository;
}

const defaultRepositories: ScanReviewRepositories = {
  scan: scanRepository,
  courses: coursesRepository,
};

export interface ScanReviewViewModel {
  round: Round | null;
  toCheck: number[];
  setStrokes: (hole: number, strokes: number | null) => void;
  setPutts: (hole: number, putts: number | null) => void;
  setGir: (hole: number, gir: boolean | null) => void;

  courseSearch: CourseSearch;
  linkedName: string | undefined;
  customName: string | undefined;
  nameToKeep: string | null;
  pickCourse: (course: CourseSummary) => void;
  nameCourse: (name: string) => void;
  changeCourse: () => void;

  tees: TeeChoice[];
  teeBox: string;
  setTeeBox: (teeBox: string) => void;
  date: string;
  setDate: (date: string) => void;
  today: string;

  saving: boolean;
  error: string | null;
  save: () => void;
  reset: () => void;
}

export function useScanReviewViewModel(
  userId: string,
  repositories: ScanReviewRepositories = defaultRepositories,
): ScanReviewViewModel {
  const { scan, courses } = repositories;
  const { session, setSession } = useScanSession();
  const draft = session.review;
  const [linkError, setLinkError] = useState<string | null>(null);

  const externalSearch = useMemo(
    () => ({ searchCourses: (query: string, user?: string) => courses.searchCourses(query, user, true) }),
    [courses],
  );
  const courseSearch = useCourseSearch(userId, externalSearch);
  const { reset: resetSearch, setQuery: setSearchQuery } = courseSearch;
  const { mutateAsync: saveScan, isPending: saving, error: saveError, reset: resetSave } =
    useSaveScan(userId, scan);

  const linkedId = draft?.course.status === "linked" ? (draft.course.id ?? undefined) : undefined;
  const linkedQuery = useCourse(linkedId, courses);
  const linkedCourse = linkedId ? (linkedQuery.data ?? null) : null;

  const round = useMemo(() => (draft ? reviewedRound(draft, linkedCourse) : null), [draft, linkedCourse]);

  const update = useCallback(
    (change: (draft: ScanReviewDraft) => ScanReviewDraft) =>
      setSession((current) => (current.review ? { ...current, review: change(current.review) } : current)),
    [setSession],
  );

  const pickCourse = useCallback(
    (picked: CourseSummary) => {
      const link = reviewCourseFrom(picked);
      if ("error" in link) {
        setLinkError(link.error);
        return;
      }
      setLinkError(null);
      update((current) => ({ ...current, course: link.course }));
      resetSearch();
    },
    [update, resetSearch],
  );

  const nameCourse = useCallback(
    (name: string) => {
      setLinkError(null);
      update((current) => ({ ...current, course: { status: "named", name } }));
      resetSearch();
    },
    [update, resetSearch],
  );

  const changeCourse = useCallback(() => {
    const name = draft?.course.name ?? null;
    update((current) => ({ ...current, course: { status: "picking", name } }));
    setSearchQuery(name ?? "");
  }, [draft, update, setSearchQuery]);

  const save = useCallback(() => {
    if (!draft || saving) return;
    setLinkError(null);
    saveScan(saveRequestFrom(userId, draft))
      .then((roundId) => setSession({ ...newScanSession(), savedRoundId: roundId }))
      .catch(() => undefined);
  }, [draft, saving, saveScan, userId, setSession]);

  const reset = useCallback(() => {
    setLinkError(null);
    resetSearch();
    resetSave();
  }, [resetSearch, resetSave]);

  const course = draft?.course;
  const scannedCourse = draft?.scan.round.course ?? null;
  const teeBox = draft?.teeBox ?? "";

  return {
    round,
    toCheck: draft ? strokesToCheck(draft.scan, draft.holes) : [],
    setStrokes: (hole, strokes) => update((current) => withHoleEdit(current, hole, { strokes })),
    setPutts: (hole, putts) => update((current) => withHoleEdit(current, hole, { putts })),
    setGir: (hole, gir) => update((current) => withHoleEdit(current, hole, { gir })),

    courseSearch,
    linkedName: course?.status === "linked" ? course.name : undefined,
    customName: course?.status === "named" ? course.name : undefined,
    nameToKeep: course?.status === "picking" && !courseSearch.query ? course.name : null,
    pickCourse,
    nameCourse,
    changeCourse,

    tees: linkedCourse ? teeOptions(linkedCourse) : scannedTeeOptions(scannedCourse),
    teeBox,
    setTeeBox: (next) => update((current) => ({ ...current, teeBox: next || null })),
    date: draft?.date ?? "",
    setDate: (date) => update((current) => ({ ...current, date })),
    today: todayIso(),

    saving,
    error: saveError ? messageFrom(saveError, USER_FACING_ERRORS.saveRound) : linkError,
    save,
    reset,
  };
}
