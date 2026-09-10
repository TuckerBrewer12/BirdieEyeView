import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import type { RoundSummary, CourseSummary } from "@/types/golf";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

export type SortKey = "date" | "total_score" | "to_par" | "course_name";
export type FilterMode = "all" | "l20" | "best" | string;

export interface FilterChipItem {
  key: string;
  label: string;
  mode: FilterMode;
}

export interface SortOption {
  value: SortKey;
  label: string;
}

export interface RoundsUiState {
  loading: boolean;
  rounds: RoundSummary[];
  filteredRounds: RoundSummary[];
  visibleRounds: RoundSummary[];
  remainingCount: number;
  /** "12 rounds played" — the count of everything, for the sticky header. */
  headerSubtitle: string;
  /** "4 rounds" — the count after filtering and search, for the list toolbar. */
  resultCountLabel: string;
  search: string;
  filterMode: FilterMode;
  chips: FilterChipItem[];
  sortAsc: boolean;
  sortLabel: string;
  sortOptions: readonly SortOption[];
  effectiveSortKey: SortKey;
  sortLocked: boolean;
  linkingRoundId: string | null;
  linkQuery: string;
  linkResults: CourseSummary[];
  linkSearching: boolean;
  linking: boolean;
  linkError: string | null;
}

export interface RoundsPageViewModel extends RoundsUiState {
  loadMore: () => void;
  setSearch: (q: string) => void;
  setFilterMode: (mode: FilterMode) => void;
  selectSortKey: (key: SortKey) => void;
  toggleSortDirection: () => void;
  handleLinkQuery: (q: string) => void;
  handleSelectCourse: (roundId: string, course: CourseSummary) => void;
  openLink: (roundId: string) => void;
  closeLink: () => void;
  /** Whether this round's course-link panel is the one showing. */
  isLinkOpen: (roundId: string) => boolean;
  toggleLink: (roundId: string) => void;
  linkTitleFor: (round: RoundSummary) => string;
}

/**
 * The one place a sort key's label is written. Typing it as Record<SortKey, …>
 * makes a new key a compile error until it is labelled here, and sortOptions is
 * derived from it so the menu cannot drift from the label on the trigger.
 */
const SORT_LABELS: Record<SortKey, string> = {
  date: "Date",
  total_score: "Score",
  to_par: "To Par",
  course_name: "Course",
};

const SORT_OPTIONS: readonly SortOption[] = (
  Object.keys(SORT_LABELS) as SortKey[]
).map((value) => ({ value, label: SORT_LABELS[value] }));

/** Best mode sorts by score whatever the chosen key is, so it labels as Score. */
function sortLabelFor(filterMode: FilterMode, sortKey: SortKey): string {
  return SORT_LABELS[filterMode === "best" ? "total_score" : sortKey];
}

function pluralizeRounds(n: number): string {
  return `${n} ${n === 1 ? "round" : "rounds"}`;
}

export function useRoundsPageViewModel(
  userId: string,
  repository: RoundsRepository = roundsRepository,
): RoundsPageViewModel {
  const queryClient = useQueryClient();
  const { data: rounds = [], isLoading: loading } = useQuery({
    queryKey: ["rounds", userId],
    queryFn: () => repository.getRoundsForUser(userId, 100),
  });

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const {
    query: linkQuery,
    setQuery: handleLinkQuery,
    results: linkResults,
    searching: linkSearching,
    reset: resetCourseSearch,
  } = useCourseSearch(userId);
  const [linkingRoundId, setLinkingRoundId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

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
    ];
  }, [rounds]);

  const handleSelectCourse = useCallback(async (roundId: string, course: CourseSummary) => {
    setLinking(true);
    setLinkError(null);
    try {
      const updated = await repository.linkCourse(roundId, course.id);
      queryClient.setQueryData<RoundSummary[]>(["rounds", userId], (prev) =>
        prev ? prev.map((r) => (r.id === roundId ? updated : r)) : [updated],
      );
      setLinkingRoundId(null);
      resetCourseSearch();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Could not link that round to the selected course.");
    } finally {
      setLinking(false);
    }
  }, [queryClient, userId, repository, resetCourseSearch]);

  const openLink = useCallback((roundId: string) => {
    setLinkingRoundId(roundId);
    resetCourseSearch();
    setLinkError(null);
  }, [resetCourseSearch]);

  const closeLink = useCallback(() => {
    setLinkingRoundId(null);
    resetCourseSearch();
    setLinkError(null);
  }, [resetCourseSearch]);

  const isLinkOpen = useCallback(
    (roundId: string) => linkingRoundId === roundId,
    [linkingRoundId],
  );

  // Only one panel is open at a time, so tapping the link icon on the open row
  // closes it and tapping any other row moves the panel there.
  const toggleLink = useCallback(
    (roundId: string) => {
      if (linkingRoundId === roundId) closeLink();
      else openLink(roundId);
    },
    [linkingRoundId, closeLink, openLink],
  );

  const linkTitleFor = useCallback(
    (round: RoundSummary) =>
      `Link "${round.course_name ? formatCourseName(round.course_name) : "this round"}" to a saved course`,
    [],
  );

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
    headerSubtitle: `${rounds.length} rounds played`,
    resultCountLabel: pluralizeRounds(filteredRounds.length),
    loadMore,
    search,
    setSearch,
    filterMode,
    setFilterMode,
    chips,
    sortAsc,
    sortLabel: sortLabelFor(filterMode, sortKey),
    sortOptions: SORT_OPTIONS,
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
    isLinkOpen,
    toggleLink,
    linkTitleFor,
  };
}
