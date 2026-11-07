import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { useGoalReport } from "@/data/useGoalReport";
import { useUser } from "@/data/useUser";
import {
  Round,
  shortGamePointsFrom,
  trendPointsFrom,
  type RoundSummary,
  type RoundTrendPoint,
  type ScoreMix,
} from "@/domain";
import { goalStandingFrom, type GoalStanding } from "@/domain/goal";
import type { DashboardDto, UserDto } from "@/types/api";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";
import {
  bestRecentRoundFrom,
  milestonesFrom,
  recentScoresFrom,
  recentShortGame,
  whsFrom,
  type HiTrend,
  type Milestone,
  type PuttsRating,
  type ShortGameTrend,
  type TrendView,
  type WhsBreakdown,
} from "./model";

export type { HiTrend, TrendView, WhsBreakdown };

export interface DashboardPageViewModel {
  data: DashboardDto | null;
  user: UserDto | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /** Score and handicap per round across the window, oldest first. */
  trend: RoundTrendPoint[];
  /** Scores across the trend window, oldest first. */
  recentScores: number[];
  /** Null until two rounds have both short-game rates. */
  shortGameTrend: ShortGameTrend | null;
  milestones: Milestone[];
  last20ScoringAvg: number | null;
  /** L5 minus L20 as the server worked it out: negative when the recent rounds came in lower. */
  scoringAverageChange: number | null;
  handicapDelta: number | null;
  /** Null until the window has a scored hole. */
  l20ScoreMix: ScoreMix | null;
  mixHoleCount: number;
  hiTrend: HiTrend | null;
  girPct: number | null;
  /** The last five rounds' score mix. Null until they have a scored hole. */
  recentScoreMix: ScoreMix | null;
  scramblingPct: number | null;
  upAndDownPct: number | null;
  /** Putts per round: the last five rounds', else every round's, as the server picked them. */
  putts: number | null;
  /** The server's rating of those putts. Null without putts. */
  puttsRating: PuttsRating | null;
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  trendView: TrendView;
  setTrendView: (view: TrendView) => void;
  rounds: RoundSummary[];
  /** The best of the listed rounds, as the server picked it. */
  bestRound: RoundSummary | null;
  recentRounds: RoundSummary[];
  sidebarRounds: RoundSummary[];
  whs: WhsBreakdown;
  /** Null until the player sets a scoring goal. */
  goal: GoalStanding | null;
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
    queryFn: () => repository.getDashboard(userId),
  });

  const { data: user } = useUser(userId, repository);
  const { data: goalReport } = useGoalReport(userId, user?.scoring_goal, repository);

  const data = fetched ?? null;

  const rounds = useMemo(
    () => (data?.recent_rounds ?? []).map(Round.fromSummary),
    [data?.recent_rounds],
  );
  const bestRound = useMemo(
    () => bestRecentRoundFrom(rounds, data?.best_recent_round_id),
    [rounds, data?.best_recent_round_id],
  );

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  const trend = useMemo(() => trendPointsFrom(data), [data]);
  const recentScores = useMemo(() => recentScoresFrom(trend), [trend]);
  const shortGameTrend = useMemo(
    () => (data ? recentShortGame(shortGamePointsFrom(data.scrambling_trend, data.up_and_down_trend)) : null),
    [data],
  );
  const report = goalReport ?? null;

  return {
    data,
    user: user ?? null,
    loading,
    error: error as Error | null,
    refetch: () => void refetch(),
    trend,
    recentScores,
    shortGameTrend,
    milestones: data ? milestonesFrom(data.milestones) : [],
    last20ScoringAvg: data?.scoring_average_l20 ?? null,
    scoringAverageChange: data?.scoring_average_change ?? null,
    handicapDelta: data?.handicap_change.delta ?? null,
    l20ScoreMix: data && data.score_mix_holes > 0 ? data.score_mix : null,
    mixHoleCount: data?.score_mix_holes ?? 0,
    hiTrend: data?.handicap_change.direction ?? null,
    girPct: data?.recent_form.gir_pct ?? null,
    recentScoreMix: data?.recent_score_mix ?? null,
    scramblingPct: data?.recent_form.scrambling_pct ?? null,
    upAndDownPct: data?.recent_form.up_and_down_pct ?? null,
    putts: data?.putts_per_round ?? null,
    puttsRating: data?.putts_rating ?? null,
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
    goal: goalStandingFrom(user?.scoring_goal, report),
  };
}
