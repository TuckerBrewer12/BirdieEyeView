import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { useGoalReport } from "@/data/useGoalReport";
import { useUser } from "@/data/useUser";
import { Round, trendPointsFrom, type RoundSummary, type RoundTrendPoint } from "@/domain";
import type { DashboardDto, UserDto } from "@/types/api";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";
import {
  bestRecentRoundFrom,
  goalProgress,
  milestonesFrom,
  whsFrom,
  windowFiguresFrom,
  type ChangeVerdict,
  type DashboardWindowKey,
  type GoalProgress,
  type Milestone,
  type WhsBreakdown,
  type WindowFigures,
} from "./model";

export type { ChangeVerdict, DashboardWindowKey, WhsBreakdown, WindowFigures };

export interface DashboardPageViewModel {
  data: DashboardDto | null;
  user: UserDto | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  /** The Last 5 / Last 20 switch. */
  window: DashboardWindowKey;
  setWindow: (window: DashboardWindowKey) => void;
  /** The figures over the picked window. Null until the dashboard loads. */
  figures: WindowFigures | null;
  /** Score and handicap per round across the picked window, oldest first. */
  trend: RoundTrendPoint[];
  /** The index after each round in the window, oldest first: the handicap figure's line. */
  handicapLine: (number | null)[];
  /** Each round's five-round average in the window: the scoring average's line. */
  averageLine: (number | null)[];
  /** Each round's scrambling rate in the window: null where it had no missed green. */
  scramblingLine: (number | null)[];
  milestones: Milestone[];
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  /** Every round the dashboard lists, newest first: the calendar's. */
  rounds: RoundSummary[];
  /** The best of the listed rounds, as the server picked it. */
  bestRound: RoundSummary | null;
  /** The desktop card's rows. */
  recentRounds: RoundSummary[];
  /** The phone's, one fewer. */
  phoneRounds: RoundSummary[];
  whs: WhsBreakdown;
  /** Null until the player sets a scoring goal. */
  goal: GoalProgress | null;
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

const DESKTOP_ROUNDS = 4;
const PHONE_ROUNDS = 3;

export function useDashboardPageViewModel(
  userId: string,
  repository: DashboardRepository = dashboardRepository,
): DashboardPageViewModel {
  const [handicapSheetOpen, setHandicapSheetOpen] = useState(false);
  const [window, setWindow] = useState<DashboardWindowKey>("last5");

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

  const figures = useMemo(
    () => (data ? windowFiguresFrom(window === "last5" ? data.windows.last_5 : data.windows.last_20) : null),
    [data, window],
  );
  const size = figures?.size ?? 0;
  const trend = useMemo(() => trendPointsFrom(data).slice(-size), [data, size]);
  const scramblingLine = useMemo(
    () => (data?.scrambling_trend ?? []).slice(-size).map((row) => row.scrambling_percentage),
    [data, size],
  );

  return {
    data,
    user: user ?? null,
    loading,
    error: error as Error | null,
    refetch: () => void refetch(),
    window,
    setWindow,
    figures,
    trend,
    handicapLine: trend.map((point) => point.handicapIndex),
    averageLine: trend.map((point) => point.rollingAverage),
    scramblingLine,
    milestones: data ? milestonesFrom(data.milestones) : [],
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
    rounds,
    bestRound,
    recentRounds: rounds.slice(0, DESKTOP_ROUNDS),
    phoneRounds: rounds.slice(0, PHONE_ROUNDS),
    whs: data ? whsFrom(data.whs) : EMPTY_WHS,
    goal: goalProgress(user?.scoring_goal, goalReport ?? null),
  };
}
