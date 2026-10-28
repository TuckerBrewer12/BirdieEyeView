import { useEffect, useState } from "react";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseSummary } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "./coursesRepository";
import { useCourses } from "./useCourses";

const SEARCH_DEBOUNCE_MS = 300;

export interface CoursesPageViewModel {
  loading: boolean;
  error: string | null;
  /** Empty copy — false while loading or when a load error is showing. */
  showEmpty: boolean;
  visibleCourses: CourseSummary[];
  search: string;
  setSearch: (q: string) => void;
}

export function useCoursesPageViewModel(
  userId: string,
  repository: CoursesRepository = coursesRepository,
): CoursesPageViewModel {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: visibleCourses = [], isLoading: loading, isError, error } = useCourses(
    userId,
    debouncedSearch,
    repository,
  );
  const loadError = isError ? messageFrom(error, "Could not load courses.") : null;

  return {
    loading,
    error: loadError,
    showEmpty: !loading && loadError == null && visibleCourses.length === 0,
    visibleCourses,
    search,
    setSearch,
  };
}
