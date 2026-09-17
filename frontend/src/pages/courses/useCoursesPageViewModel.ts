import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { pluralize } from "@/lib/pluralize";
import type { CourseSummary } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "./coursesRepository";

const SEARCH_DEBOUNCE_MS = 300;

export interface CoursesPageViewModel {
  loading: boolean;
  error: string | null;
  /** Empty copy — false while loading or when a load error is showing. */
  showEmpty: boolean;
  visibleCourses: CourseSummary[];
  headerSubtitle: string;
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

  const { data: courses = [], isLoading: loading, isError, error } = useQuery({
    queryKey: queryKeys.courses(userId, debouncedSearch),
    queryFn: () =>
      debouncedSearch
        ? repository.searchCourses(debouncedSearch, userId)
        : repository.getCourses(userId),
  });

  const visibleCourses = courses;

  const loadError = isError
    ? (error instanceof Error ? error.message : "Could not load courses.")
    : null;

  return {
    loading,
    error: loadError,
    showEmpty: !loading && loadError == null && visibleCourses.length === 0,
    visibleCourses,
    headerSubtitle: pluralize(visibleCourses.length, "course"),
    search,
    setSearch,
  };
}
