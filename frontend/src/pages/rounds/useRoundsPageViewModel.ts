import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { RoundSummary } from "@/domain";
import { messageFrom } from "@/lib/userFacingErrors";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";
import {
  SORT_LABELS,
  SORT_OPTIONS,
  courseChips,
  effectiveSort,
  filterRounds,
  modeAfterPickingSort,
  sortAfterPicking,
  type CourseFilterOption,
  type FilterMode,
  type Sort,
  type SortKey,
  type SortOption,
} from "./roundsModel";

export type { CourseFilterOption, FilterMode, SortKey, SortOption };

export interface RoundsUiState {
  loading: boolean;
  /** The list failed to load and there is none to show. */
  loadError: string | null;
  /** Empty copy — false while loading or when a load error is showing. */
  showEmpty: boolean;
  rounds: RoundSummary[];
  filteredRounds: RoundSummary[];
  visibleRounds: RoundSummary[];
  remainingCount: number;
  search: string;
  filterMode: FilterMode;
  chips: CourseFilterOption[];
  sortAsc: boolean;
  sortLabel: string;
  sortOptions: readonly SortOption[];
  effectiveSortKey: SortKey;
  sortLocked: boolean;
}

export interface RoundsPageViewModel extends RoundsUiState {
  retry: () => void;
  loadMore: () => void;
  setSearch: (q: string) => void;
  setFilterMode: (mode: FilterMode) => void;
  selectSortKey: (key: SortKey) => void;
  toggleSortDirection: () => void;
  closeLink: () => void;
  /** Whether this round's course-link panel is the one showing. */
  isLinkOpen: (roundId: string) => boolean;
  toggleLink: (roundId: string) => void;
}

export function useRoundsPageViewModel(
  userId: string,
  repository: RoundsRepository = roundsRepository,
): RoundsPageViewModel {
  const { data, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.rounds(userId),
    queryFn: () => repository.getRoundsForUser(userId, 100),
  });
  const rounds = useMemo(() => data ?? [], [data]);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "date", ascending: false });
  const [visibleCount, setVisibleCount] = useState(20);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");

  const [linkingRoundId, setLinkingRoundId] = useState<string | null>(null);

  const chips = useMemo(() => courseChips(rounds), [rounds]);

  const closeLink = useCallback(() => setLinkingRoundId(null), []);

  const isLinkOpen = useCallback(
    (roundId: string) => linkingRoundId === roundId,
    [linkingRoundId],
  );

  // Only one panel is open at a time, so tapping the link icon on the open row
  // closes it and tapping any other row moves the panel there.
  const toggleLink = useCallback((roundId: string) => {
    setLinkingRoundId((open) => (open === roundId ? null : roundId));
  }, []);

  const selectSortKey = useCallback((key: SortKey) => {
    setFilterMode(modeAfterPickingSort);
    setSort((current) => sortAfterPicking(current, key));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSort((current) => ({ ...current, ascending: !current.ascending }));
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((n) => n + 50);
  }, []);

  const filteredRounds = useMemo(
    () => filterRounds(rounds, filterMode, search, sort),
    [rounds, filterMode, search, sort],
  );
  const visibleRounds = filteredRounds.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredRounds.length - visibleCount);
  const effective = effectiveSort(filterMode, sort);
  const loadError = isError && !data ? messageFrom(error, "Could not load your rounds.") : null;

  return {
    loading,
    loadError,
    retry: () => void refetch(),
    showEmpty: !loading && loadError == null && filteredRounds.length === 0,
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
    sortAsc: effective.ascending,
    sortLabel: SORT_LABELS[effective.key],
    sortOptions: SORT_OPTIONS,
    effectiveSortKey: effective.key,
    sortLocked: effective.locked,
    selectSortKey,
    toggleSortDirection,
    closeLink,
    isLinkOpen,
    toggleLink,
  };
}
