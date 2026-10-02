import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { Round } from "@/domain";
import type { DashboardData, User } from "@/types/golf";
import type { MilestoneDto } from "@/types/api";
import type { AnalyticsData, GoalReport } from "@/types/analytics";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";
import {
  dualTrendFrom,
  pickBestRound,
  scoreMixItems,
  whsFrom,
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
  recentMilestones: MilestoneDto[];
  last20ScoringAvg: number | null;
  l5ScoringAvg: number | null;
  handicapDelta: number | null;
  l20ScoreMix: ScoreMixItem[];
  mixHoleCount: number;
  hiTrend: HiTrend | null;
  girPct: number | null;
  recentDistribution: ScoreMixItem[];
  scramblingPct: number | null;
  upAndDownPct: number | null;
  putts: number | null;
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  trendView: TrendView;
  setTrendView: (view: TrendView) => void;
  rounds: Round[];
  bestRound: Round | null;
  recentRounds: Round[];
  sidebarRounds: Round[];
  whs: WhsBreakdown;
  scoringGoal: number | null;
  goalProgressPct: number | null;
  goalOnTrack: boolean;
}

const EMPTY_WHS: WhsBreakdown = {
  rows: [],
  windowSize: 0,
  countUsed: 0,
  adjustment: 0,
  diffAvg: null,
  hasRatedRounds: false,
  showCalculation: false,
};

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
    () => (data?.recent_rounds ?? []).map(Round.fromSummary),
    [data?.recent_rounds],
  );
  const bestRound = useMemo(() => pickBestRound(rounds), [rounds]);

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  const dualData = useMemo(() => dualTrendFrom(trends), [trends]);
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
    recentMilestones: data?.milestones ?? [],
    last20ScoringAvg: data?.scoring_average_l20 ?? null,
    l5ScoringAvg: data?.scoring_average_l5 ?? null,
    handicapDelta: data?.handicap_change.delta ?? null,
    l20ScoreMix: data && data.score_mix_holes > 0 ? scoreMixItems(data.score_mix) : [],
    mixHoleCount: data?.score_mix_holes ?? 0,
    hiTrend: data?.handicap_change.direction ?? null,
    girPct: data?.recent_form.gir_pct ?? null,
    recentDistribution: data ? scoreMixItems(data.recent_score_mix, { roundTenths: true, dropZero: true }) : [],
    scramblingPct: data?.recent_form.scrambling_pct ?? null,
    upAndDownPct: data?.recent_form.up_and_down_pct ?? null,
    putts: data?.recent_form.putts_per_18 ?? data?.average_putts ?? null,
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
    trendView,
    setTrendView,
    rounds,
    bestRound,
    recentRounds: rounds.slice(0, 3),
    sidebarRounds: rounds.slice(0, 10),
    whs: data ? whsFrom(data.whs) : EMPTY_WHS,
    scoringGoal: user?.scoring_goal ?? null,
    goalProgressPct: user?.scoring_goal ? (report?.progress_pct ?? null) : null,
    goalOnTrack: report?.on_track ?? false,
  };
}
