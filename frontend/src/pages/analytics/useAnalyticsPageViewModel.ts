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

/** The score trend's two readings. */
export type ScoreReading = "gross" | "net";

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
  /** A new rounds or course filter shows every round on each trend again. */
  setLimit: (limit: number) => void;
  setCourse: (courseId: string) => void;
  /** A course is narrowing the rounds. */
  filtered: boolean;
  playedCourses: PlayedCourse[];
  /** The golfer has a home course, so the course menu offers it. */
  hasHomeCourse: boolean;

  tab: AnalyticsTab;
  setTab: (tab: AnalyticsTab) => void;

  scoreReading: ScoreReading;
  setScoreReading: (reading: ScoreReading) => void;
  /** How many of the latest rounds each trend shows; null is every round the filters read. */
  trendShown: Record<TrendChart, number | null>;
  setTrendShown: (chart: TrendChart, shown: number) => void;
  /** The lines the score trend draws: the score, and the kinds of hole counted each round. */
  trendLines: TrendLine[];
  setTrendLines: (lines: TrendLine[]) => void;

  /** The par type the approach section shows. Until one is picked, par 4s if there are any. */
  approachPar: ApproachPar;
  setApproachPar: (par: ApproachPar) => void;

  /** The Profile section, over the golfer's last 20 rounds whatever the filters. */
  profile: ProfileViewModel;
}

export interface AnalyticsPageOptions {
  initialTab?: AnalyticsTab;
  /** A friend to compare with on Profile from the start: Social's Compare opens Profile this way. */
  initialFriendId?: string | null;
  repository?: AnalyticsRepository;
}

export function useAnalyticsPageViewModel(
  userId: string,
  { initialTab = DEFAULT_TAB, initialFriendId = null, repository = analyticsRepository }: AnalyticsPageOptions = {},
): AnalyticsPageViewModel {
  const [filters, setFiltersState] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [trendShown, setTrendShownState] = useState<Record<TrendChart, number | null>>(ALL_ROUNDS_SHOWN);
  // New filters read new rounds, so each trend's slider starts over at all of them.
  const setFilters = (update: (current: AnalyticsFilters) => AnalyticsFilters) => {
    setFiltersState(update);
    setTrendShownState(ALL_ROUNDS_SHOWN);
  };
  const [tab, setTab] = useState<AnalyticsTab>(initialTab);
  const [scoreReading, setScoreReading] = useState<ScoreReading>("gross");
  const [trendLines, setTrendLines] = useState<TrendLine[]>(DEFAULT_TREND_LINES);
  const [pickedPar, setApproachPar] = useState<ApproachPar | null>(null);

  const { data, isPending, isPlaceholderData, isError, error, refetch } = useAnalytics(userId, filters, analyticsFrom, repository);
  const { data: playedCourses = [] } = usePlayedCourses(userId, repository);
  const { data: user } = useUser(userId, repository);
  // Read once Profile has been opened, and kept while the golfer moves between sections.
  const [profileOpened, setProfileOpened] = useState(initialTab === "profile");
  const profile = useProfileViewModel(userId, profileOpened, repository, initialFriendId);

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
