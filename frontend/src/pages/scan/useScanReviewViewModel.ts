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
  /** The card as it will save, with the golfer's edits. Null until there is a card to check. */
  round: Round | null;
  /** Holes whose score the scan wasn't sure of, until the golfer types over them. */
  toCheck: number[];
  setStrokes: (hole: number, strokes: number | null) => void;
  setPutts: (hole: number, putts: number | null) => void;
  setGir: (hole: number, gir: boolean | null) => void;

  /** Search over saved and the course provider's courses, to link the round to. */
  courseSearch: CourseSearch;
  /** The course the round is linked to. */
  linkedName: string | undefined;
  /** The name the round is saved under, without a link. */
  customName: string | undefined;
  /** The name read off the card, offered while picking with an empty search. */
  nameToKeep: string | null;
  pickCourse: (course: CourseSummary) => void;
  /** Saves the round without a link, under this name. */
  nameCourse: (name: string) => void;
  /** Back to picking, with the search open on the current name. */
  changeCourse: () => void;

  /** The tees to choose from: the linked course's, else the ones read off the card. */
  tees: TeeChoice[];
  teeBox: string;
  setTeeBox: (teeBox: string) => void;
  /** `YYYY-MM-DD`. */
  date: string;
  setDate: (date: string) => void;
  /** The latest date a round can be played on. */
  today: string;

  saving: boolean;
  /** Why the last course pick or save failed. */
  error: string | null;
  save: () => void;
  /** Forgets the search and any failed save, for the next card. */
  reset: () => void;
}

/**
 * Checking a card before it is saved: typed-over scores, the course and tee, the date. The card
 * lives in the scan session, so the edits survive leaving the page; saving goes through
 * `useSaveScan`, and a saved card ends the session on the saved round.
 */
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
      // The mutation holds the failure, and the review shows it.
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
