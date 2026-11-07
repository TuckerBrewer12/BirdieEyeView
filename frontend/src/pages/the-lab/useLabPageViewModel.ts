import { useCallback, useMemo, useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useFriendships } from "@/data/useFriendships";
import { useGoalReport } from "@/data/useGoalReport";
import { useUpdateUser } from "@/data/useUpdateUser";
import { useUser } from "@/data/useUser";
import type {
  BenchmarkHandicap,
  BenchmarkShape,
  BenchmarkTarget,
  ComparisonTargetValue,
  GoalAttempt,
} from "@/domain/benchmark";
import { buildRadarData, type RadarEntry } from "@/domain/radar";
import { labRepository, type LabRepository } from "./labRepository";
import { useBenchmarkComparison } from "./useBenchmarkComparison";
import {
  LAB_FILTERS,
  friendOptionsFrom,
  goalStandingFrom,
  labAnalyticsFrom,
  labPanelsFrom,
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

/** How a friend comparison stands: no friends to pick, their rounds loading, too few rounds, or drawn. */
export type FriendComparison = "no-friends" | "loading" | "no-rounds" | "ready";

export interface LabPageViewModel {
  /** True until the golfer's analytics and the benchmarks on offer first load. */
  loading: boolean;
  error: Error | null;
  retry: () => void;
  analytics: LabAnalytics | null;

  /** Null until the golfer sets a goal. */
  goal: GoalStanding | null;
  setGoal: (target: number) => void;
  savingGoal: boolean;
  goalSaveError: Error | null;

  scoringAverage: number | null;
  /** The goal report's lowest full round in the window. Null without a goal, and until its report loads. */
  lowestScore: number | null;
  /** Last five rounds against the window's average; negative is lower. */
  recentTrend: number | null;

  /** The goals the golfer can pick, as stored, the highest score first. Empty until they load. */
  goalOptions: number[];
  /** The handicaps the golfer can compare with, scratch first. Empty until they load. */
  handicaps: BenchmarkHandicap[];

  radarMode: RadarMode;
  setRadarMode: (mode: RadarMode) => void;
  comparison: ComparisonTargetValue;
  setComparison: (target: ComparisonTargetValue) => void;
  friends: FriendOption[];
  selectedFriend: FriendOption | null;
  selectFriend: (friendId: string) => void;
  /** Null unless comparing with a friend. */
  friendComparison: FriendComparison | null;
  /** The server's shape drawn behind the golfer's, or null with nothing to compare. */
  benchmark: BenchmarkShape | null;
  /** The axes the golfer has figures for. */
  radar: RadarEntry[];
  /** The axes they don't, yet. */
  missingAxes: string[];

  /** The window's scored rounds, oldest first, each marked met or not by the goal report. */
  attempts: GoalAttempt[];
  /** Null without a goal, and until the goal's report loads. */
  roundsMeetingGoal: number | null;
  parTypes: ParTypeRow[];
  putting: PuttingSummary | null;
  peak: PeakGame | null;
  /** Birdies, bogeys and doubles a round in the best rounds against every round, and what each is worth. */
  peakImpacts: PeakImpact[];

  /** The phone's panels with something to show, in order. */
  panels: LabPanel[];
  /** The phone's open panel: the one picked while it has something to show, else the first. */
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
  // Peak needs a goal and two rounds; without them the shape is the golfer's average.
  const mode: RadarMode = radarMode === "peak" && !peak ? "benchmark" : radarMode;

  const friends = useMemo(() => friendOptionsFrom(friendships ?? []), [friendships]);
  // A friend who has since gone falls back to the first one listed.
  const selectedFriend = friends.find((f) => f.id === pickedFriendId) ?? friends.at(0) ?? null;
  const comparingFriend = mode === "benchmark" && comparison === "friend";
  // Who the server holds the golfer up against; nothing when it's their shape alone.
  const against = useMemo<BenchmarkTarget | null>(() => {
    if (mode === "peak") return { against: "peak" };
    if (comparison === "friend") return selectedFriend ? { against: "friend", friendId: selectedFriend.id } : null;
    return comparison != null ? { against: "handicap", handicap: comparison } : null;
  }, [mode, comparison, selectedFriend]);
  // The golfer's par types alone, and the goals and handicaps there are benchmarks for.
  const alone = useBenchmarkComparison(userId, null, repository);
  const compared = useBenchmarkComparison(userId, against, repository);
  const comparisonData = against ? (compared.data ?? null) : null;
  const benchmark = comparisonData?.benchmark ?? null;

  const radarAll = useMemo(
    () => (analytics ? buildRadarData(analytics.shape, benchmark) : []),
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

  const parTypes = comparisonData?.parTypes ?? alone.data?.parTypes ?? [];
  const putting = useMemo(() => (analytics ? puttingSummaryFrom(analytics) : null), [analytics]);
  const panels = labPanelsFrom(parTypes, putting, peak);
  const panel = pickedPanel != null && panels.includes(pickedPanel) ? pickedPanel : (panels[0] ?? null);

  const goal = goalStandingFrom(target, report);
  const { mutate } = updateUser;
  const setGoal = useCallback((next: number) => mutate({ scoring_goal: next }), [mutate]);

  return {
    loading: mine.isLoading || alone.isLoading,
    error: mine.error ?? alone.error,
    retry: () => {
      void mine.refetch();
      void alone.refetch();
    },
    analytics,

    goal,
    setGoal,
    savingGoal: updateUser.isPending,
    goalSaveError: updateUser.error,

    scoringAverage: analytics?.kpis.scoring_average ?? null,
    lowestScore: goal?.lowestScore ?? null,
    recentTrend: analytics?.kpis.scoring_average_change ?? null,

    goalOptions: alone.data?.goals ?? [],
    handicaps: alone.data?.handicaps ?? [],

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
