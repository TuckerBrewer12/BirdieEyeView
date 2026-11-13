import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundLine, type RoundSummary } from "@/domain";
import { formatCourseName } from "@/domain/course";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";
import {
  ALL_COURSES,
  ALL_COURSES_LABEL,
  SCOPE_OPTIONS,
  SORT_LABELS,
  SORT_OPTIONS,
  courseOptions,
  effectiveSort,
  filterRounds,
  scopeAfterPickingSort,
  type Option,
  type Scope,
  type SortKey,
} from "./roundsModel";

export type { Option, Scope, SortKey };

/** The round a link sheet is for, worded: its title line and the button that keeps it as it is. */
export interface LinkingRound {
  id: string;
  /** "Scanned Scorecard · Mar 9 · 85". */
  line: string;
  /** "Keep as “Scanned Scorecard”", or "Leave it unlinked" for a round with no name. */
  keepLabel: string;
}

export interface RoundsUiState {
  loading: boolean;
  rounds: RoundSummary[];
  filteredRounds: RoundSummary[];
  visibleRounds: RoundSummary[];
  remainingCount: number;
  search: string;
  /** The phone keeps its search behind an icon until it is opened, or while it holds a query. */
  searchOpen: boolean;
  scope: Scope;
  scopeOptions: readonly Option<Scope>[];
  course: string;
  courseOptions: Option<string>[];
  /** The course menu's trigger: the course picked, or "All courses". */
  courseLabel: string;
  sortKey: SortKey;
  sortLabel: string;
  sortOptions: readonly Option<SortKey>[];
  /** The round whose course-link panel or sheet is open. */
  linking: LinkingRound | null;
}

export interface RoundsPageViewModel extends RoundsUiState {
  loadMore: () => void;
  setSearch: (q: string) => void;
  toggleSearch: () => void;
  setScope: (scope: Scope) => void;
  /** The segmented control's pick. Tapping the pressed option again leaves it pressed. */
  pickScope: (value: string | undefined) => void;
  setCourse: (course: string) => void;
  selectSort: (key: SortKey) => void;
  closeLink: () => void;
  /** Whether this round's course-link panel is the one showing. */
  isLinkOpen: (roundId: string) => boolean;
  toggleLink: (roundId: string) => void;
}

function linkingRound(round: RoundSummary): LinkingRound {
  const name = round.course?.name;
  return {
    id: round.id,
    line: roundLine(round),
    keepLabel: name ? `Keep as “${formatCourseName(name)}”` : "Leave it unlinked",
  };
}

export function useRoundsPageViewModel(
  userId: string,
  repository: RoundsRepository = roundsRepository,
): RoundsPageViewModel {
  const { data: rounds = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.rounds(userId),
    queryFn: () => repository.getRoundsForUser(userId, 100),
  });

  const [search, setSearch] = useState("");
  const [searchShown, setSearchShown] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [scope, setScope] = useState<Scope>("all");
  const [course, setCourse] = useState(ALL_COURSES);
  const [visibleCount, setVisibleCount] = useState(20);
  const [linkingRoundId, setLinkingRoundId] = useState<string | null>(null);

  const courses = useMemo(() => courseOptions(rounds), [rounds]);

  const closeLink = useCallback(() => setLinkingRoundId(null), []);
  const isLinkOpen = useCallback((roundId: string) => linkingRoundId === roundId, [linkingRoundId]);

  // Only one panel is open at a time, so tapping Link on the open row closes it and tapping any
  // other row moves the panel there.
  const toggleLink = useCallback((roundId: string) => {
    setLinkingRoundId((open) => (open === roundId ? null : roundId));
  }, []);

  const selectSort = useCallback((key: SortKey) => {
    setScope(scopeAfterPickingSort);
    setSort(key);
  }, []);

  const pickScope = useCallback((value: string | undefined) => {
    const picked = SCOPE_OPTIONS.find((option) => option.value === value);
    if (picked) setScope(picked.value);
  }, []);

  const toggleSearch = useCallback(() => setSearchShown((shown) => !shown), []);

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + 50);
  }, []);

  const filteredRounds = useMemo(
    () => filterRounds(rounds, { scope, course, search, sort }),
    [rounds, scope, course, search, sort],
  );
  const visibleRounds = filteredRounds.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredRounds.length - visibleCount);
  const sortKey = effectiveSort(scope, sort);
  const linkingSummary = rounds.find((round) => round.id === linkingRoundId);

  return {
    loading,
    rounds,
    filteredRounds,
    visibleRounds,
    remainingCount,
    loadMore,
    search,
    setSearch,
    searchOpen: searchShown || search !== "",
    toggleSearch,
    scope,
    scopeOptions: SCOPE_OPTIONS,
    setScope,
    pickScope,
    course,
    courseOptions: courses,
    courseLabel: courses.find((option) => option.value === course)?.label ?? ALL_COURSES_LABEL,
    setCourse,
    sortKey,
    sortLabel: SORT_LABELS[sortKey],
    sortOptions: SORT_OPTIONS,
    selectSort,
    linking: linkingSummary ? linkingRound(linkingSummary) : null,
    closeLink,
    isLinkOpen,
    toggleLink,
  };
}
