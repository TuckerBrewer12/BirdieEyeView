import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import {
  bestRound as pickBestRound,
  goalProgressPct,
  handicapDelta,
  handicapTrend,
  lifetimeMilestones,
  mixHoleCount,
  recentStats,
  roundFromDto,
  roundFromSummary,
  scoreMix,
  scoringAvg,
  whsBreakdown,
  type HandicapTrend,
  type MilestoneFact,
  type RecentStats,
  type Round,
  type ScoreMixItem,
  type WhsBreakdown,
} from "@/domain";
import type { DashboardData, User } from "@/types/golf";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";

export type TrendView = "score" | "hcp";

/** One score-trend row joined with the handicap row at the same index, for the dual chart. */
export interface DualTrendPoint {
  round_index: number;
  total_score: number | null;
  to_par: number | null;
  handicap_index: number | null;
  course_name?: string | null;
  used_in_hi?: boolean | null;
  differential?: number | null;
  hi_threshold?: number | null;
}

function dualTrendFrom(trends: AnalyticsData | null): DualTrendPoint[] {
  if (!trends) return [];
  return trends.score_trend.map((row, i) => ({
    ...row,
    handicap_index: trends.handicap_trend[i]?.handicap_index ?? null,
    used_in_hi: trends.handicap_trend[i]?.used_in_hi ?? null,
    differential: trends.handicap_trend[i]?.differential ?? null,
    hi_threshold: trends.handicap_trend[i]?.hi_threshold ?? null,
  }));
}

export interface DashboardPageViewModel {
  data: DashboardData | null;
  trends: AnalyticsData | null;
  user: User | null;
  goalReport: GoalReport | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  dualData: DualTrendPoint[];
  recentMilestones: MilestoneFact[];
  last20ScoringAvg: number | null;
  l5ScoringAvg: number | null;
  handicapDelta: number | null;
  handicapTrend: HandicapTrend | null;
  l20ScoreMix: ScoreMixItem[];
  mixHoleCount: number;
  recentDistribution: ScoreMixItem[];
  /** GIR, scrambling, up-and-down, and putts over the last 5 rounds. */
  stats: RecentStats;
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  trendView: TrendView;
  setTrendView: (view: TrendView) => void;
  rounds: Round[];
  bestRound: Round | null;
  /** The three latest, read from the full round so hole pars fall back to the course. */
  recentRounds: Round[];
  sidebarRounds: Round[];
  whs: WhsBreakdown;
  scoringGoal: number | null;
  goalProgressPct: number | null;
  goalOnTrack: boolean;
}

export function useDashboardPageViewModel(
  userId: string,
  repository: DashboardRepository = dashboardRepository,
): DashboardPageViewModel {
  const [handicapSheetOpen, setHandicapSheetOpen] = useState(false);
  const [trendView, setTrendView] = useState<TrendView>("score");

  const { data: fetched, isLoading: loading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard(userId),
    queryFn: async () => {
      const [dashboardResult, analyticsResult] = await Promise.allSettled([
        repository.getDashboard(userId),
        repository.getAnalytics(userId),
      ]);
      if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;
      return [
        dashboardResult.value,
        analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
      ] as const;
    },
  });

  const { data: user } = useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => repository.getUser(userId),
  });

  const { data: goalReport } = useQuery({
    queryKey: queryKeys.goalReport(userId),
    queryFn: () => repository.getGoalReport(userId, 20),
    enabled: !!user?.scoring_goal,
    retry: false,
  });

  const data = fetched?.[0] ?? null;
  const trends = fetched?.[1] ?? null;

  const rounds = useMemo(
    () => (data?.recent_rounds ?? []).map(roundFromSummary),
    [data?.recent_rounds],
  );
  const bestRound = useMemo(() => pickBestRound(rounds), [rounds]);
  const roundIds = useMemo(() => rounds.slice(0, 3).map((r) => r.id), [rounds]);

  const { data: fetchedRounds } = useQuery({
    queryKey: ["dashboard-round-details", roundIds],
    queryFn: () => Promise.all(roundIds.map((id) => repository.getRound(id))),
    enabled: roundIds.length > 0,
  });

  const recentRounds = useMemo(
    () =>
      rounds.slice(0, 3).map((round) => {
        const detail = fetchedRounds?.find((d) => d.id === round.id);
        return detail ? roundFromDto(detail) : round;
      }),
    [rounds, fetchedRounds],
  );

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  const dualData = useMemo(() => dualTrendFrom(trends), [trends]);
  const report = goalReport ?? null;
  const distribution = trends?.score_type_distribution ?? [];

  return {
    data,
    trends,
    user: user ?? null,
    goalReport: report,
    loading,
    error: error as Error | null,
    refetch,
    dualData,
    recentMilestones: lifetimeMilestones(trends?.notable_achievements),
    last20ScoringAvg: scoringAvg(trends),
    l5ScoringAvg: scoringAvg(trends, 5),
    handicapDelta: handicapDelta(trends),
    handicapTrend: handicapTrend(trends),
    l20ScoreMix: scoreMix(distribution),
    mixHoleCount: mixHoleCount(distribution),
    recentDistribution: scoreMix(distribution.slice(-5), { roundTenths: true, dropZero: true }),
    stats: recentStats(trends, { puttsFallback: data?.average_putts }),
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
    trendView,
    setTrendView,
    rounds,
    bestRound,
    recentRounds,
    sidebarRounds: rounds.slice(0, 10),
    whs: whsBreakdown(trends, data?.handicap_index),
    scoringGoal: user?.scoring_goal ?? null,
    goalProgressPct: goalProgressPct(user?.scoring_goal, report, trends),
    goalOnTrack: report?.on_track ?? false,
  };
}
