import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { CourseSummary } from "@/types/golf";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export interface CourseSearch {
  query: string;
  setQuery: (query: string) => void;
  results: CourseSummary[];
  searching: boolean;
  reset: () => void;
}

export function useCourseSearch(userId?: string): CourseSearch {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await api.searchCourses(q.trim(), userId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [userId]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setQueryState("");
    setResults([]);
    setSearching(false);
  }, []);

  return { query, setQuery, results, searching, reset };
}
