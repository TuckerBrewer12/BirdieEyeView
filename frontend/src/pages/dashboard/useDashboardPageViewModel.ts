import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { DashboardData, Round, RoundSummary, User } from "@/types/golf";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";
import {
  dualTrendFrom,
  girPct,
  goalBarPct,
  goalProgressPct,
  handicapDelta,
  hiTrend,
  last20ScoringAvg,
  last5ScoringAvg,
  milestonesFrom,
  mixFromRows,
  mixHoleCount,
  pickBestRound,
  puttsAvg,
  recentRoundIds,
  scramblingPct,
  upAndDownPct,
  whsBreakdown,
  type DualTrendPoint,
  type HiTrend,
  type ScoreMixItem,
  type TrendView,
  type WhsBreakdown,
} from "./model";

export type { DualTrendPoint, HiTrend, TrendView, WhsBreakdown };
export type { ScoreMixItem };

export interface DashboardPageViewModel {
  data: DashboardData | null;
  trends: AnalyticsData | null;
  user: User | null;
  goalReport: GoalReport | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  dualData: DualTrendPoint[];
  recentMilestones: ReturnType<typeof milestonesFrom>;
  last20ScoringAvg: number | null;
  l5ScoringAvg: number | null;
  handicapDelta: number | null;
  l20ScoreMix: ScoreMixItem[];
  mixHoleCount: number;
  hiTrend: HiTrend | null;
  girPct: number;
  recentDistribution: ScoreMixItem[];
  scramblingPct: number | null;
  upAndDownPct: number | null;
  putts: number;
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  trendView: TrendView;
  setTrendView: (view: TrendView) => void;
  bestRound: RoundSummary | null;
  bestRoundDetail: Round | null;
  recentSummaries: RoundSummary[];
  roundsById: Map<string, Round>;
  sidebarRounds: RoundSummary[];
  whs: WhsBreakdown;
  scoringGoal: number | null;
  goalBarPct: number;
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

  const bestRound = useMemo(
    () => pickBestRound(data?.recent_rounds ?? []),
    [data?.recent_rounds],
  );
  const recentSummaries = useMemo(
    () => (data?.recent_rounds ?? []).slice(0, 3),
    [data?.recent_rounds],
  );
  const roundIds = useMemo(
    () => recentRoundIds(bestRound, recentSummaries),
    [bestRound, recentSummaries],
  );

  const { data: fetchedRounds } = useQuery({
    queryKey: ["dashboard-round-details", roundIds],
    queryFn: () => Promise.all(roundIds.map((id) => repository.getRound(id))),
    enabled: roundIds.length > 0,
  });

  const roundsById = useMemo(() => {
    const map = new Map<string, Round>();
    for (const round of fetchedRounds ?? []) {
      if (round.id) map.set(round.id, round);
    }
    return map;
  }, [fetchedRounds]);

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  const dualData = useMemo(() => dualTrendFrom(trends), [trends]);
  const last20 = useMemo(() => last20ScoringAvg(trends), [trends]);
  const report = goalReport ?? null;

  return {
    data,
    trends,
    user: user ?? null,
    goalReport: report,
    loading,
    error: error as Error | null,
    refetch,
    dualData,
    recentMilestones: milestonesFrom(trends),
    last20ScoringAvg: last20,
    l5ScoringAvg: last5ScoringAvg(trends),
    handicapDelta: handicapDelta(trends),
    l20ScoreMix: mixFromRows(trends?.score_type_distribution ?? []),
    mixHoleCount: mixHoleCount(trends),
    hiTrend: hiTrend(trends),
    girPct: girPct(trends),
    recentDistribution: mixFromRows((trends?.score_type_distribution ?? []).slice(-5), {
      roundTenths: true,
      dropZero: true,
    }),
    scramblingPct: scramblingPct(trends),
    upAndDownPct: upAndDownPct(trends),
    putts: puttsAvg(trends, data?.average_putts),
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
    trendView,
    setTrendView,
    bestRound,
    bestRoundDetail: bestRound ? roundsById.get(bestRound.id) ?? null : null,
    recentSummaries,
    roundsById,
    sidebarRounds: (data?.recent_rounds ?? []).slice(0, 10),
    whs: whsBreakdown(dualData, trends, data?.handicap_index),
    scoringGoal: user?.scoring_goal ?? null,
    goalBarPct: goalBarPct(report),
    goalProgressPct: goalProgressPct(user?.scoring_goal, report, last20, dualData),
    goalOnTrack: report?.on_track ?? false,
  };
}
