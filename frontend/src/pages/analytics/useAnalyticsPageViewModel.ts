import { useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useUser } from "@/data/useUser";
import type { RoundSummary } from "@/domain";
import { messageFrom } from "@/lib/userFacingErrors";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import {
  DEFAULT_FILTERS,
  analyticsFrom,
  defaultRangePar,
  isFiltered,
  type Analytics,
  type AnalyticsFilters,
  type AnalyticsTab,
  type PlayedCourse,
  type RangePar,
} from "./model";
import { useBestRound } from "./useBestRound";
import { usePlayedCourses } from "./usePlayedCourses";

export interface AnalyticsPageViewModel {
  loading: boolean;
  refreshing: boolean;
  loadError: string | null;
  retry: () => void;
  analytics: Analytics | null;
  showEmpty: boolean;

  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters) => void;
  filtered: boolean;
  playedCourses: PlayedCourse[];
  hasHomeCourse: boolean;

  bestRound: RoundSummary | null;

  rangePar: RangePar;
  setRangePar: (par: RangePar) => void;

  tab: AnalyticsTab;
  setTab: (tab: AnalyticsTab) => void;
}

export function useAnalyticsPageViewModel(
  userId: string,
  repository: AnalyticsRepository = analyticsRepository,
): AnalyticsPageViewModel {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<AnalyticsTab>("scoring");
  const [pickedRangePar, setRangePar] = useState<RangePar | null>(null);

  const { data, isPending, isPlaceholderData, isError, error, refetch } = useAnalytics(userId, filters, analyticsFrom, repository);
  const { data: playedCourses = [] } = usePlayedCourses(userId, repository);
  const { data: user } = useUser(userId, repository);

  const analytics = data ?? null;
  const { data: bestRound } = useBestRound(analytics?.bestRound?.roundId ?? null, repository);
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
    bestRound: analytics?.bestRound?.roundId ? (bestRound ?? null) : null,
    rangePar: pickedRangePar ?? defaultRangePar(analytics?.yardageBuckets ?? []),
    setRangePar,
    tab,
    setTab,
  };
}
