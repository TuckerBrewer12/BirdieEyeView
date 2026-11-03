import { useCallback } from "react";
import { teeColors } from "@/domain";
import { useCourseSearch, type CourseSearch } from "@/data/useCourseSearch";
import type { CourseSummary } from "@/domain/course";
import { coursesRepository, type CoursesRepository } from "../courses/coursesRepository";
import { useCourse } from "../courses/useCourse";
import { reviewFromSetup, todayIso, type ManualSetup } from "./scanModel";
import { useScanSession } from "./scanSession";

export interface ScanSetupViewModel {
  courseSearch: CourseSearch;
  linkedName: string | undefined;
  customName: string | undefined;
  pickCourse: (course: CourseSummary) => void;
  nameCourse: (name: string) => void;
  clearCourse: () => void;

  tees: string[];
  loadingTees: boolean;
  teeBox: string;
  setTeeBox: (teeBox: string) => void;

  date: string;
  setDate: (date: string) => void;
  today: string;

  start: () => void;
  reset: () => void;
}

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
