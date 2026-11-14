import { useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useUser } from "@/data/useUser";
import { messageFrom } from "@/lib/userFacingErrors";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import {
  DEFAULT_FILTERS,
  DEFAULT_TAB,
  analyticsFrom,
  defaultApproachPar,
  isFiltered,
  type Analytics,
  type AnalyticsFilters,
  type AnalyticsTab,
  type ApproachPar,
  type PlayedCourse,
  ALL_ROUNDS_SHOWN,
  DEFAULT_TREND_LINES,
  type TrendChart,
  type TrendLine,
} from "./model";
import { useProfileViewModel, type ProfileViewModel } from "./useProfileViewModel";
import { usePlayedCourses } from "./usePlayedCourses";

export type ScoreReading = "gross" | "net";

export interface AnalyticsPageViewModel {
  loading: boolean;
  loadError: string | null;
  retry: () => void;
  analytics: Analytics | null;
  showEmpty: boolean;

  filters: AnalyticsFilters;
  setLimit: (limit: number) => void;
  setCourse: (courseId: string) => void;
  filtered: boolean;
  playedCourses: PlayedCourse[];
  hasHomeCourse: boolean;

  tab: AnalyticsTab;
  setTab: (tab: AnalyticsTab) => void;

  scoreReading: ScoreReading;
  setScoreReading: (reading: ScoreReading) => void;
  trendShown: Record<TrendChart, number | null>;
  setTrendShown: (chart: TrendChart, shown: number) => void;
  trendLines: TrendLine[];
  setTrendLines: (lines: TrendLine[]) => void;

  approachPar: ApproachPar;
  setApproachPar: (par: ApproachPar) => void;

  profile: ProfileViewModel;
}

export interface AnalyticsPageOptions {
  initialTab?: AnalyticsTab;
  initialFriendId?: string | null;
  repository?: AnalyticsRepository;
}

export function useAnalyticsPageViewModel(
  userId: string,
  { initialTab = DEFAULT_TAB, initialFriendId = null, repository = analyticsRepository }: AnalyticsPageOptions = {},
): AnalyticsPageViewModel {
  const [filters, setFiltersState] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [trendShown, setTrendShownState] = useState<Record<TrendChart, number | null>>(ALL_ROUNDS_SHOWN);
  const setFilters = (update: (current: AnalyticsFilters) => AnalyticsFilters) => {
    setFiltersState(update);
    setTrendShownState(ALL_ROUNDS_SHOWN);
  };
  const [tab, setTab] = useState<AnalyticsTab>(initialTab);
  const [scoreReading, setScoreReading] = useState<ScoreReading>("gross");
  const [trendLines, setTrendLines] = useState<TrendLine[]>(DEFAULT_TREND_LINES);
  const [pickedPar, setApproachPar] = useState<ApproachPar | null>(null);

  const { data, isPending, isError, error, refetch } = useAnalytics(userId, filters, analyticsFrom, repository);
  const { data: playedCourses = [] } = usePlayedCourses(userId, repository);
  const { data: user } = useUser(userId, repository);
  const [profileOpened, setProfileOpened] = useState(initialTab === "profile");
  const profile = useProfileViewModel(userId, profileOpened, repository, initialFriendId);

  const analytics = data ?? null;
  const loadError = isError ? messageFrom(error, "Could not load your analytics.") : null;

  return {
    loading: isPending,
    loadError,
    retry: () => void refetch(),
    analytics,
    showEmpty: analytics != null && loadError == null && analytics.roundCount === 0,
    filters,
    setLimit: (limit) => setFilters((current) => ({ ...current, limit })),
    setCourse: (courseId) => setFilters((current) => ({ ...current, courseId })),
    filtered: isFiltered(filters),
    playedCourses,
    hasHomeCourse: !!user?.home_course_id,
    tab,
    setTab: (next) => {
      if (next === "profile") setProfileOpened(true);
      setTab(next);
    },
    scoreReading,
    setScoreReading,
    trendLines,
    setTrendLines,
    trendShown,
    setTrendShown: (chart, shown) => setTrendShownState((current) => ({ ...current, [chart]: shown })),
    approachPar: pickedPar ?? defaultApproachPar(analytics?.yardageBuckets ?? []),
    setApproachPar,
    profile,
  };
}
