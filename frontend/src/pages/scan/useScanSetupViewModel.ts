import { useCallback } from "react";
import { teeColors } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/data/useCourseSearch";
import type { CourseSummary } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { useCourse } from "../courses/useCourse";
import { reviewFromSetup, todayIso, type ManualSetup } from "./scanModel";
import { useScanSession } from "./scanSession";

export interface ScanSetupViewModel {
  /** Search over the golfer's saved courses. */
  courseSearch: CourseSearch;
  /** The saved course picked. */
  linkedName: string | undefined;
  /** A name typed for a course we don't have. */
  customName: string | undefined;
  pickCourse: (course: CourseSummary) => void;
  /** Uses a typed name for a course we don't have. */
  nameCourse: (name: string) => void;
  /** Back to searching: empty after a picked course, on the name after a typed one. */
  clearCourse: () => void;

  /** The picked course's tee colours, once it has loaded. Empty means the tee is typed. */
  tees: string[];
  /** The picked course is still loading, so its tees aren't known yet. */
  loadingTees: boolean;
  teeBox: string;
  setTeeBox: (teeBox: string) => void;

  /** `YYYY-MM-DD`. */
  date: string;
  setDate: (date: string) => void;
  /** The latest date a round can be played on. */
  today: string;

  /** Opens a blank card on the chosen course, tee and date. */
  start: () => void;
  /** Forgets the search, for the next card. */
  reset: () => void;
}

/**
 * Choosing the course, tee and date before typing scores in by hand. The choices live in the
 * scan session with the rest of the card; starting opens the review on a blank card.
 */
export function useScanSetupViewModel(
  userId: string,
  courses: CoursesRepository = coursesRepository,
): ScanSetupViewModel {
  const { session, setSession } = useScanSession();
  const { setup } = session;
  const courseSearch = useCourseSearch(userId, courses);
  const { reset: resetSearch, setQuery: setSearchQuery } = courseSearch;

  const pickedId = setup.course?.id ?? undefined;
  const courseQuery = useCourse(pickedId, courses);
  const pickedCourse = pickedId ? (courseQuery.data ?? null) : null;

  const update = useCallback(
    (patch: Partial<ManualSetup>) =>
      setSession((current) => ({ ...current, setup: { ...current.setup, ...patch } })),
    [setSession],
  );

  const pickCourse = useCallback(
    (course: CourseSummary) => {
      update({ course: { id: course.id, name: course.name ?? course.id }, teeBox: "" });
      resetSearch();
    },
    [update, resetSearch],
  );

  const nameCourse = useCallback(
    (name: string) => {
      update({ course: { id: null, name }, teeBox: "" });
      resetSearch();
    },
    [update, resetSearch],
  );

  const clearCourse = useCallback(() => {
    const typed = setup.course && !setup.course.id ? setup.course.name : "";
    update({ course: null, teeBox: "" });
    setSearchQuery(typed);
  }, [setup.course, update, setSearchQuery]);

  const start = useCallback(() => {
    setSession((current) => ({ ...current, review: reviewFromSetup(current.setup, pickedCourse) }));
  }, [setSession, pickedCourse]);

  return {
    courseSearch,
    linkedName: setup.course?.id ? setup.course.name : undefined,
    customName: setup.course && !setup.course.id ? setup.course.name : undefined,
    pickCourse,
    nameCourse,
    clearCourse,

    tees: teeColors(pickedCourse),
    loadingTees: courseQuery.isLoading,
    teeBox: setup.teeBox,
    setTeeBox: (teeBox) => update({ teeBox }),

    date: setup.date,
    setDate: (date) => update({ date }),
    today: todayIso(),

    start,
    reset: resetSearch,
  };
}
