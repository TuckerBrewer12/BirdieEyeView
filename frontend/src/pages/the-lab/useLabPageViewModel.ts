import { useCallback, useMemo, useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useFriendships } from "@/data/useFriendships";
import { useGoalReport } from "@/data/useGoalReport";
import { useUpdateUser } from "@/data/useUpdateUser";
import { useUser } from "@/data/useUser";
import type { BenchmarkShape, BenchmarkTarget, ComparisonTargetValue, GoalAttempt } from "@/domain/benchmark";
import { buildRadarData, type RadarEntry } from "@/domain/radar";
import { labRepository, type LabRepository } from "./labRepository";
import { useBenchmarkComparison } from "./useBenchmarkComparison";
import {
  LAB_FILTERS,
  friendOptionsFrom,
  goalStandingFrom,
  labAnalyticsFrom,
  labPanelsFrom,
  parTypeRowsFrom,
  peakGameFrom,
  puttingSummaryFrom,
  type FriendOption,
  type GoalStanding,
  type LabAnalytics,
  type LabPanel,
  type ParTypeRow,
  type PeakGame,
  type PeakImpact,
  type PuttingSummary,
  type RadarMode,
} from "./model";

export type FriendComparison = "no-friends" | "loading" | "no-rounds" | "ready";

export interface LabPageViewModel {
  loading: boolean;
  error: Error | null;
  retry: () => void;
  analytics: LabAnalytics | null;

  goal: GoalStanding | null;
  setGoal: (target: number) => void;
  savingGoal: boolean;
  goalSaveError: Error | null;

  scoringAverage: number | null;
  bestScore: number | null;
  recentTrend: number | null;

  radarMode: RadarMode;
  setRadarMode: (mode: RadarMode) => void;
  comparison: ComparisonTargetValue;
  setComparison: (target: ComparisonTargetValue) => void;
  friends: FriendOption[];
  selectedFriend: FriendOption | null;
  selectFriend: (friendId: string) => void;
  friendComparison: FriendComparison | null;
  benchmark: BenchmarkShape | null;
  radar: RadarEntry[];
  missingAxes: string[];

  attempts: GoalAttempt[];
  roundsMeetingGoal: number | null;
  parTypes: ParTypeRow[];
  putting: PuttingSummary | null;
  peak: PeakGame | null;
  peakImpacts: PeakImpact[];

  panels: LabPanel[];
  panel: LabPanel | null;
  setPanel: (panel: LabPanel) => void;
}

export function useLabPageViewModel(
  userId: string,
  repository: LabRepository = labRepository,
): LabPageViewModel {
  const [radarMode, setRadarModeState] = useState<RadarMode>("benchmark");
  const [comparison, setComparison] = useState<ComparisonTargetValue>(null);
  const [pickedFriendId, setPickedFriendId] = useState<string | null>(null);
  const [pickedPanel, setPanel] = useState<LabPanel | null>(null);

  const { data: user } = useUser(userId, repository);
  const target = user?.scoring_goal ?? null;
  const { data: report } = useGoalReport(userId, target, repository);
  const mine = useAnalytics(userId, LAB_FILTERS, labAnalyticsFrom, repository);
  const { data: friendships } = useFriendships(userId, repository);
  const updateUser = useUpdateUser(userId, repository);

  const analytics = mine.data ?? null;
  const peak = useMemo(
    () => (analytics ? peakGameFrom(analytics, target, report) : null),
    [analytics, target, report],
  );
  const mode: RadarMode = radarMode === "peak" && !peak ? "benchmark" : radarMode;

  const friends = useMemo(() => friendOptionsFrom(friendships ?? []), [friendships]);
  const selectedFriend = friends.find((f) => f.id === pickedFriendId) ?? friends[0] ?? null;
  const comparingFriend = mode === "benchmark" && comparison === "friend";
  const against = useMemo<BenchmarkTarget | null>(() => {
    if (mode === "peak") return { against: "peak" };
    if (comparison === "friend") return selectedFriend ? { against: "friend", friendId: selectedFriend.id } : null;
    return comparison != null ? { against: "handicap", handicap: comparison } : null;
  }, [mode, comparison, selectedFriend]);
  const compared = useBenchmarkComparison(userId, against, repository);
  const comparisonData = against ? (compared.data ?? null) : null;
  const benchmark = comparisonData?.benchmark ?? null;

  const radarAll = useMemo(
    () => (analytics ? buildRadarData(analytics.kpis, analytics.scoring_by_par, benchmark) : []),
    [analytics, benchmark],
  );

  const friendComparison: FriendComparison | null = !comparingFriend
    ? null
    : !selectedFriend
      ? "no-friends"
      : compared.isLoading
        ? "loading"
        : benchmark
          ? "ready"
          : "no-rounds";

  const setRadarMode = useCallback(
    (next: RadarMode) => {
      if (next === "peak" && !peak) return;
      setRadarModeState(next);
    },
    [peak],
  );

  const parTypes = useMemo(
    () => comparisonData?.parTypes ?? (analytics ? parTypeRowsFrom(analytics) : []),
    [comparisonData, analytics],
  );
  const putting = useMemo(() => (analytics ? puttingSummaryFrom(analytics) : null), [analytics]);
  const panels = labPanelsFrom(parTypes, putting, peak);
  const panel = pickedPanel != null && panels.includes(pickedPanel) ? pickedPanel : (panels[0] ?? null);

  const goal = goalStandingFrom(target, report);
  const { mutate } = updateUser;
  const setGoal = useCallback((next: number) => mutate({ scoring_goal: next }), [mutate]);

  return {
    loading: mine.isLoading,
    error: mine.error,
    retry: () => void mine.refetch(),
    analytics,

    goal,
    setGoal,
    savingGoal: updateUser.isPending,
    goalSaveError: updateUser.error,

    scoringAverage: analytics?.kpis.scoring_average ?? null,
    bestScore: report?.best_score ?? analytics?.lowestScore ?? null,
    recentTrend: analytics?.kpis.scoring_average_change ?? null,

    radarMode: mode,
    setRadarMode,
    comparison,
    setComparison,
    friends,
    selectedFriend,
    selectFriend: setPickedFriendId,
    friendComparison,
    benchmark,
    radar: radarAll.filter((entry) => entry.hasData),
    missingAxes: radarAll.filter((entry) => !entry.hasData).map((entry) => entry.axis),

    attempts: goal?.attempts ?? [],
    roundsMeetingGoal: goal?.roundsMeetingGoal ?? null,
    parTypes,
    putting,
    peak,
    peakImpacts: peak ? (analytics?.peak_game?.impacts ?? []) : [],

    panels,
    panel,
    setPanel,
  };
}
