import { useCallback, useMemo, useState } from "react";
import { useFriendships } from "@/data/useFriendships";
import { useGoalReport } from "@/data/useGoalReport";
import { useUpdateUser } from "@/data/useUpdateUser";
import { useUser } from "@/data/useUser";
import {
  HANDICAP_BENCHMARK,
  nearestGoalBenchmark,
  type BenchmarkProfile,
  type ComparisonTargetValue,
} from "@/domain/benchmark";
import { benchmarkProfileFrom, buildRadarData, type RadarEntry } from "@/domain/radar";
import { labRepository, type LabRepository } from "./labRepository";
import { useLabAnalytics } from "./useLabAnalytics";
import {
  friendOptionsFrom,
  goalStandingFrom,
  lowestScore,
  parTypeRowsFrom,
  peakGameFrom,
  peakImpactsFrom,
  peakVsAverageFrom,
  puttingSummaryFrom,
  recentTrendFrom,
  roundsMeetingGoal,
  scoresOf,
  type FriendOption,
  type GoalStanding,
  type LabAnalytics,
  type ParTypeRow,
  type PeakGame,
  type PeakImpact,
  type PeakVsAverage,
  type PuttingSummary,
  type RadarMode,
} from "./model";

/** How a friend comparison stands: no friends to pick, their rounds loading, too few rounds, or drawn. */
export type FriendComparison = "no-friends" | "loading" | "no-rounds" | "ready";

/** The attempts chart shows at most this many of the latest rounds. */
const ATTEMPTS_SHOWN = 24;

export interface LabPageViewModel {
  /** True until the golfer's analytics first load. */
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
  bestScore: number | null;
  /** Last five rounds against the window's average; negative is lower. */
  recentTrend: number | null;

  radarMode: RadarMode;
  setRadarMode: (mode: RadarMode) => void;
  comparison: ComparisonTargetValue;
  setComparison: (target: ComparisonTargetValue) => void;
  friends: FriendOption[];
  selectedFriend: FriendOption | null;
  selectFriend: (friendId: string) => void;
  /** Null unless comparing with a friend. */
  friendComparison: FriendComparison | null;
  /** The profile drawn behind the golfer's shape, or null with nothing to compare. */
  benchmark: BenchmarkProfile | null;
  /** The axes the golfer has figures for. */
  radar: RadarEntry[];
  /** The axes they don't, yet. */
  missingAxes: string[];

  /** Scores of the latest rounds, oldest first. */
  attempts: number[];
  roundsMeetingGoal: number;
  parTypes: ParTypeRow[];
  putting: PuttingSummary | null;
  peak: PeakGame | null;
  /** Birdies, bogeys and doubles a round in the best rounds against every round. */
  peakVsAverage: PeakVsAverage | null;
  peakImpacts: PeakImpact[];
}

export function useLabPageViewModel(
  userId: string,
  repository: LabRepository = labRepository,
): LabPageViewModel {
  const [radarMode, setRadarModeState] = useState<RadarMode>("benchmark");
  const [comparison, setComparison] = useState<ComparisonTargetValue>(null);
  const [pickedFriendId, setPickedFriendId] = useState<string | null>(null);

  const { data: user } = useUser(userId, repository);
  const target = user?.scoring_goal ?? null;
  const { data: report } = useGoalReport(userId, target, repository);
  const mine = useLabAnalytics(userId, repository);
  const { data: friendships } = useFriendships(userId, repository);
  const updateUser = useUpdateUser(userId, repository);

  const analytics = mine.data ?? null;
  const peak = useMemo(() => (analytics ? peakGameFrom(analytics, target) : null), [analytics, target]);
  // Peak needs a goal and two rounds; without them the shape is the golfer's average.
  const mode: RadarMode = radarMode === "peak" && !peak ? "benchmark" : radarMode;

  const friends = useMemo(() => friendOptionsFrom(friendships ?? []), [friendships]);
  // A friend who has since gone falls back to the first one listed.
  const selectedFriend = friends.find((f) => f.id === pickedFriendId) ?? friends[0] ?? null;
  const comparingFriend = mode === "benchmark" && comparison === "friend";
  const theirs = useLabAnalytics(comparingFriend ? (selectedFriend?.id ?? null) : null, repository);

  const benchmark = useMemo<BenchmarkProfile | null>(() => {
    if (mode === "peak") return peak ? nearestGoalBenchmark(peak.average) : null;
    if (comparison === "friend") {
      return theirs.data ? benchmarkProfileFrom(theirs.data.kpis, theirs.data.scoring_by_par) : null;
    }
    return comparison != null ? (HANDICAP_BENCHMARK[comparison] ?? null) : null;
  }, [mode, peak, comparison, theirs.data]);

  const radarAll = useMemo(
    () => (analytics ? buildRadarData(analytics.kpis, analytics.scoring_by_par, benchmark ?? undefined) : []),
    [analytics, benchmark],
  );

  const friendComparison: FriendComparison | null = !comparingFriend
    ? null
    : !selectedFriend
      ? "no-friends"
      : theirs.isLoading
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

  const peakVsAverage = useMemo(
    () => (analytics ? peakVsAverageFrom(analytics, peak) : null),
    [analytics, peak],
  );

  const { mutate } = updateUser;
  const setGoal = useCallback((next: number) => mutate({ scoring_goal: next }), [mutate]);

  return {
    loading: mine.isLoading,
    error: mine.error,
    retry: () => void mine.refetch(),
    analytics,

    goal: goalStandingFrom(target, report),
    setGoal,
    savingGoal: updateUser.isPending,
    goalSaveError: updateUser.error,

    scoringAverage: analytics?.kpis.scoring_average ?? null,
    bestScore: report?.best_score ?? (analytics ? lowestScore(analytics) : null),
    recentTrend: analytics ? recentTrendFrom(analytics) : null,

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

    attempts: analytics ? scoresOf(analytics).slice(-ATTEMPTS_SHOWN) : [],
    roundsMeetingGoal: analytics && target != null ? roundsMeetingGoal(analytics, target) : 0,
    parTypes: analytics ? parTypeRowsFrom(analytics, benchmark) : [],
    putting: analytics ? puttingSummaryFrom(analytics) : null,
    peak,
    peakVsAverage,
    peakImpacts: peakVsAverage ? peakImpactsFrom(peakVsAverage) : [],
  };
}
