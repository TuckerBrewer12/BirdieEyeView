import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { useGoalReport } from "@/data/useGoalReport";
import { useUser } from "@/data/useUser";
import { Round, trendPointsFrom, type RoundSummary, type ScoreMix } from "@/domain";
import type { DashboardDto, UserDto } from "@/types/api";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";
import {
  bestRoundFrom,
  goalProgress,
  handicapMonthFrom,
  whsFrom,
  type BestRound,
  type ChangeVerdict,
  type GoalProgress,
  type HandicapMonth,
  type WhsBreakdown,
} from "./model";
import { greetingFor } from "./present";

export type { ChangeVerdict, WhsBreakdown };

export interface DashboardPageViewModel {
  data: DashboardDto | null;
  greeting: string;
  user: UserDto | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  handicap: HandicapMonth;
  handicapLine: (number | null)[];
  averageLine: (number | null)[];
  lastRound: RoundSummary | null;
  recentRounds: RoundSummary[];
  best: BestRound | null;
  roundsThisYear: number;
  recentMix: ScoreMix;
  goal: GoalProgress | null;
  whs: WhsBreakdown;
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
}

const EMPTY_WHS: WhsBreakdown = {
  rows: [],
  windowSize: 0,
  countUsed: 0,
  adjustment: 0,
  diffAvg: null,
  hasRatedRounds: false,
};

const EMPTY_HANDICAP: HandicapMonth = { index: null, change: null, verdict: null };
const EMPTY_MIX: ScoreMix = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 };
const RECENT_ROUNDS = 3;

export function useDashboardPageViewModel(
  userId: string,
  repository: DashboardRepository = dashboardRepository,
  now: () => Date = () => new Date(),
): DashboardPageViewModel {
  const [handicapSheetOpen, setHandicapSheetOpen] = useState(false);

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
  const trend = useMemo(() => trendPointsFrom(data), [data]);

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  return {
    data,
    greeting: greetingFor(now()),
    user: user ?? null,
    loading,
    error: error as Error | null,
    refetch: () => void refetch(),
    handicap: data ? handicapMonthFrom(data) : EMPTY_HANDICAP,
    handicapLine: trend.map((point) => point.handicapIndex),
    averageLine: trend.map((point) => point.rollingAverage),
    lastRound: rounds[0] ?? null,
    recentRounds: rounds.slice(1, 1 + RECENT_ROUNDS),
    best: data ? bestRoundFrom(data) : null,
    roundsThisYear: data?.rounds_this_year ?? 0,
    recentMix: data?.recent_score_mix ?? EMPTY_MIX,
    goal: goalProgress(user?.scoring_goal, goalReport ?? null),
    whs: data ? whsFrom(data.whs) : EMPTY_WHS,
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
  };
}
