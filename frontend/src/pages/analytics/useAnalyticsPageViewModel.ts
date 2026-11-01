import { useState } from "react";
import { useUser } from "@/data/useUser";
import { messageFrom } from "@/lib/userFacingErrors";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import {
  DEFAULT_FILTERS,
  isFiltered,
  type Analytics,
  type AnalyticsFilters,
  type AnalyticsTab,
  type PlayedCourse,
} from "./model";
import { useAnalytics } from "./useAnalytics";
import { usePlayedCourses } from "./usePlayedCourses";

export interface AnalyticsPageViewModel {
  /** Nothing to show yet: the first load for this golfer. */
  loading: boolean;
  /** New filters are loading; the last filters' figures stay up meanwhile. */
  refreshing: boolean;
  loadError: string | null;
  retry: () => void;
  /** Null until the first load lands. */
  analytics: Analytics | null;
  /** Loaded, and no round matches the filters. */
  showEmpty: boolean;

  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  /** A course or timeframe is narrowing the rounds. */
  filtered: boolean;
  playedCourses: PlayedCourse[];
  /** The golfer has a home course, so the course filter offers it. */
  hasHomeCourse: boolean;

  /** The phone layout's open section. */
  tab: AnalyticsTab;
  setTab: (tab: AnalyticsTab) => void;
}

export function useAnalyticsPageViewModel(
  userId: string,
  repository: AnalyticsRepository = analyticsRepository,
): AnalyticsPageViewModel {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<AnalyticsTab>("scoring");

  const { data, isPending, isPlaceholderData, isError, error, refetch } = useAnalytics(userId, filters, repository);
  const { data: playedCourses = [] } = usePlayedCourses(userId, repository);
  const { data: user } = useUser(userId, repository);

  const analytics = data ?? null;
  const loadError = isError ? messageFrom(error, "Could not load your analytics.") : null;

  return {
    loading: isPending,
    refreshing: isPlaceholderData,
    loadError,
    retry: () => void refetch(),
    analytics,
    showEmpty: analytics != null && loadError == null && analytics.roundCount === 0,
    filters,
    setFilters,
    filtered: isFiltered(filters),
    playedCourses,
    hasHomeCourse: !!user?.home_course_id,
    tab,
    setTab,
  };
}
