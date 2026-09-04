import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCourseName } from "@/lib/courseName";
import type { RoundSummary, CourseSummary } from "@/types/golf";

export type SortKey = "date" | "total_score" | "to_par" | "course_name";
export type FilterMode = "all" | "l20" | "best" | string;

export interface FilterChipItem {
  key: string;
  label: string;
  active: boolean;
  mode: FilterMode;
}

export interface RoundsPageViewModel {
  loading: boolean;
  rounds: RoundSummary[];
  filteredRounds: RoundSummary[];
  visibleRounds: RoundSummary[];
  remainingCount: number;
  loadMore: () => void;

  search: string;
  setSearch: (q: string) => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  chips: FilterChipItem[];

  sortKey: SortKey;
  sortAsc: boolean;
  sortLabel: string;
  effectiveSortKey: SortKey;
  sortLocked: boolean;
  selectSortKey: (key: SortKey) => void;
  toggleSortDirection: () => void;

  linkingRoundId: string | null;
  linkQuery: string;
  linkResults: CourseSummary[];
  linkSearching: boolean;
  linking: boolean;
  linkError: string | null;
  handleLinkQuery: (q: string) => void;
  handleSelectCourse: (roundId: string, course: CourseSummary) => void;
  openLink: (roundId: string) => void;
  closeLink: () => void;
}

function sortLabelFor(filterMode: FilterMode, sortKey: SortKey): string {
  if (filterMode === "best") return "Score";
  switch (sortKey) {
    case "date": return "Date";
    case "total_score": return "Score";
    case "to_par": return "To Par";
    case "course_name": return "Course";
  }
}

export function useRoundsPageViewModel(userId: string): RoundsPageViewModel {
  const queryClient = useQueryClient();
  const { data: rounds = [], isLoading: loading } = useQuery({
    queryKey: ["rounds", userId],
    queryFn: () => api.getRoundsForUser(userId, 100),
  });

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const [linkingRoundId, setLinkingRoundId] = useState<string | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkResults, setLinkResults] = useState<CourseSummary[]>([]);
  const [linkSearching, setLinkSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (linkTimer.current) clearTimeout(linkTimer.current); }, []);

  const chips = useMemo<FilterChipItem[]>(() => {
    const counts = new Map<string, number>();
    for (const r of rounds) {
      if (r.course_name) counts.set(r.course_name, (counts.get(r.course_name) ?? 0) + 1);
    }
    const courses = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);

    return [
      { key: "all", label: "All", mode: "all" as FilterMode },
      { key: "l20", label: "L20", mode: "l20" as FilterMode },
      { key: "best", label: "Best", mode: "best" as FilterMode },
      ...courses.map((name) => ({
        key: name,
        label: formatCourseName(name),
        mode: name,
      })),
    ].map((chip) => ({ ...chip, active: filterMode === chip.mode }));
  }, [rounds, filterMode]);

  const handleLinkQuery = useCallback((q: string) => {
    setLinkQuery(q);
    if (linkTimer.current) clearTimeout(linkTimer.current);
    if (q.trim().length < 2) { setLinkResults([]); return; }
    linkTimer.current = setTimeout(async () => {
      setLinkSearching(true);
      try {
        const results = await api.searchCourses(q.trim(), userId);
        setLinkResults(results);
      } catch { setLinkResults([]); }
      finally { setLinkSearching(false); }
    }, 300);
  }, [userId]);

  const handleSelectCourse = useCallback(async (roundId: string, course: CourseSummary) => {
    setLinking(true);
    setLinkError(null);
    try {
      const updated = await api.linkCourse(roundId, course.id);
      queryClient.setQueryData<RoundSummary[]>(["rounds", userId], (prev) =>
        prev ? prev.map((r) => r.id === roundId ? updated : r) : [updated]
      );
      setLinkingRoundId(null);
      setLinkQuery("");
      setLinkResults([]);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not link that round to the selected course.");
    } finally {
      setLinking(false);
    }
  }, [queryClient, userId]);

  const openLink = useCallback((roundId: string) => {
    setLinkingRoundId(roundId);
    setLinkQuery(""); setLinkResults([]); setLinkError(null);
  }, []);

  const closeLink = useCallback(() => {
    setLinkingRoundId(null);
    setLinkQuery(""); setLinkResults([]); setLinkError(null);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) { setSortAsc((prev) => !prev); }
    else { setSortKey(key); setSortAsc(key === "course_name"); }
  }, [sortKey]);

  const selectSortKey = useCallback((key: SortKey) => {
    if (filterMode === "best") setFilterMode("all");
    handleSort(key);
  }, [filterMode, handleSort]);

  const toggleSortDirection = useCallback(() => {
    setSortAsc((prev) => !prev);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + 50);
  }, []);

  const filteredRounds = useMemo(() => {
    let result = [...rounds];
    if (filterMode === "l20") {
      result = [...result].sort((a, b) => ((b.date ?? "") > (a.date ?? "") ? 1 : -1)).slice(0, 20);
    } else if (filterMode !== "all" && filterMode !== "best") {
      result = result.filter((r) => r.course_name === filterMode);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.course_name?.toLowerCase().includes(q));
    }
    const key: SortKey = filterMode === "best" ? "total_score" : sortKey;
    const asc = filterMode === "best" ? true : sortAsc;
    result.sort((a, b) => {
      let av: number | string | null, bv: number | string | null;
      switch (key) {
        case "date":        av = a.date ?? "";       bv = b.date ?? "";       break;
        case "total_score": av = a.total_score;      bv = b.total_score;      break;
        case "to_par":      av = a.to_par;           bv = b.to_par;           break;
        case "course_name": av = a.course_name ?? ""; bv = b.course_name ?? ""; break;
      }
      if (av === null) return 1; if (bv === null) return -1;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return result;
  }, [rounds, filterMode, search, sortKey, sortAsc]);

  const visibleRounds = filteredRounds.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredRounds.length - visibleCount);
  const sortLocked = filterMode === "best";
  const effectiveSortKey: SortKey = sortLocked ? "total_score" : sortKey;

  return {
    loading,
    rounds,
    filteredRounds,
    visibleRounds,
    remainingCount,
    loadMore,
    search,
    setSearch,
    filterMode,
    setFilterMode,
    chips,
    sortKey,
    sortAsc,
    sortLabel: sortLabelFor(filterMode, sortKey),
    effectiveSortKey,
    sortLocked,
    selectSortKey,
    toggleSortDirection,
    linkingRoundId,
    linkQuery,
    linkResults,
    linkSearching,
    linking,
    linkError,
    handleLinkQuery,
    handleSelectCourse,
    openLink,
    closeLink,
  };
}
