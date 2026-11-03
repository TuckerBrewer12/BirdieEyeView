import { useCallback, useEffect, useRef, useState } from "react";
import {
  roundsRepository,
  type CourseSearchRepository,
} from "@/pages/rounds/roundsRepository";
import type { CourseSummary } from "@/domain/course";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export interface CourseSearch {
  query: string;
  setQuery: (query: string) => void;
  results: CourseSummary[];
  searching: boolean;
  reset: () => void;
}

export function useCourseSearch(
  userId?: string,
  repository: CourseSearchRepository = roundsRepository,
): CourseSearch {
  const [query, setQueryState] = useState("");
  const [results, setResults] = useState<CourseSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequest = useRef(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    latestRequest.current += 1;
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < MIN_QUERY_LENGTH) {
      latestRequest.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const request = (latestRequest.current += 1);
      const isCurrent = () => request === latestRequest.current;
      setSearching(true);
      try {
        const found = await repository.searchCourses(q.trim(), userId);
        if (isCurrent()) setResults(found);
      } catch {
        if (isCurrent()) setResults([]);
      } finally {
        if (isCurrent()) setSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [userId, repository]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    latestRequest.current += 1;
    setQueryState("");
    setResults([]);
    setSearching(false);
  }, []);

  return { query, setQuery, results, searching, reset };
}
