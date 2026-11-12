import { useCallback, useMemo, useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useFriendships } from "@/data/useFriendships";
import { useGoalReport } from "@/data/useGoalReport";
import { useUpdateUser } from "@/data/useUpdateUser";
import { useUser } from "@/data/useUser";
import type { BenchmarkTarget, ComparisonTargetValue } from "@/domain/benchmark";
import { buildRadarData, radarStanding, type RadarEntry, type RadarStanding } from "@/domain/radar";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import {
  PROFILE_FILTERS,
  friendOptionsFrom,
  goalStandingFrom,
  peakGameFrom,
  profileAnalyticsFrom,
  type FriendOption,
  type GoalStanding,
  type PeakGame,
  type PeakImpact,
  type RadarMode,
} from "./profileModel";
import { useBenchmarkComparison } from "./useBenchmarkComparison";

/** How a friend comparison stands: no friends to pick, their rounds loading, too few rounds, or drawn. */
export type FriendComparison = "no-friends" | "loading" | "no-rounds" | "ready";

/** The Profile section: the goal, the golfer's shape against a comparison, where to find strokes, and the peak game. */
export interface Profile {
  /** True until the profile's last 20 rounds first load. */
  loading: boolean;
  error: Error | null;
  retry: () => void;

  /** Null until the golfer sets a goal. */
  goal: GoalStanding | null;
  setGoal: (target: number) => void;
  savingGoal: boolean;
  goalSaveError: Error | null;

  radarMode: RadarMode;
  setRadarMode: (mode: RadarMode) => void;
  /** Peak needs a goal and two scored rounds. */
  peakAvailable: boolean;
  /** The handicap, the friend, or null with nothing to compare (no index yet). */
  comparison: ComparisonTargetValue;
  selectedFriend: FriendOption | null;
  pickComparison: (value: ComparisonTargetValue, friendId: string | null) => void;
  friends: FriendOption[];
  /** Null unless comparing with a friend. */
  friendComparison: FriendComparison | null;
  /** The comparison has a shape to draw behind the golfer's. */
  compared: boolean;
  /** The axes the golfer has figures for. */
  radar: RadarEntry[];
  /** Ahead and behind on the radar, by the server's verdicts. */
  standing: RadarStanding;

  peak: PeakGame | null;
  /** Birdies, bogeys and doubles a round in the best rounds against every round, and what each is worth. */
  peakImpacts: PeakImpact[];
}

/** `active` once the Profile section opens: until then its last 20 rounds aren't read. */
export function useProfile(
  userId: string,
  active: boolean,
  repository: AnalyticsRepository = analyticsRepository,
): Profile {
  const [radarMode, setRadarModeState] = useState<RadarMode>("benchmark");
  const [picked, setPicked] = useState<{ value: ComparisonTargetValue; friendId: string | null } | null>(null);

  const { data: user } = useUser(userId, repository);
  const target = user?.scoring_goal ?? null;
  const { data: report } = useGoalReport(userId, target, repository);
  const mine = useAnalytics(active ? userId : null, PROFILE_FILTERS, profileAnalyticsFrom, repository);
  const { data: friendships } = useFriendships(userId, repository);
  const updateUser = useUpdateUser(userId, repository);

  const analytics = mine.data ?? null;
  const peak = useMemo(() => (analytics ? peakGameFrom(analytics, target, report) : null), [analytics, target, report]);
  // Peak needs a goal and two rounds; without them the shape is the golfer's average.
  const mode: RadarMode = radarMode === "peak" && !peak ? "benchmark" : radarMode;

  const friends = useMemo(() => friendOptionsFrom(friendships ?? []), [friendships]);
  // Until the golfer picks, the next level up from their index.
  const comparison: ComparisonTargetValue = picked?.value ?? analytics?.next_level_handicap ?? null;
  // A friend who has since gone falls back to the first one listed.
  const selectedFriend = friends.find((f) => f.id === picked?.friendId) ?? friends.at(0) ?? null;

  const against = useMemo<BenchmarkTarget | null>(() => {
    if (mode === "peak") return { against: "peak" };
    if (comparison === "friend") return selectedFriend ? { against: "friend", friendId: selectedFriend.id } : null;
    return comparison != null ? { against: "handicap", handicap: comparison } : null;
  }, [mode, comparison, selectedFriend]);
  const compared = useBenchmarkComparison(userId, against, repository);
  const comparisonData = against ? (compared.data ?? null) : null;
  const benchmark = comparisonData?.benchmark ?? null;

  const radarAll = useMemo(
    () => (analytics ? buildRadarData(analytics.kpis, analytics.scoring_by_par, benchmark, comparisonData?.verdicts) : []),
    [analytics, benchmark, comparisonData],
  );
  const radar = radarAll.filter((entry) => entry.hasData);

  const friendComparison: FriendComparison | null =
    mode !== "benchmark" || comparison !== "friend"
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

  const { mutate } = updateUser;
  const setGoal = useCallback((next: number) => mutate({ scoring_goal: next }), [mutate]);

  return {
    loading: !active || mine.isLoading,
    error: mine.error,
    retry: () => void mine.refetch(),

    goal: goalStandingFrom(target, report),
    setGoal,
    savingGoal: updateUser.isPending,
    goalSaveError: updateUser.error,

    radarMode: mode,
    setRadarMode,
    peakAvailable: peak != null,
    comparison,
    selectedFriend,
    pickComparison: (value, friendId) => setPicked({ value, friendId }),
    friends,
    friendComparison,
    compared: benchmark != null,
    radar,
    standing: radarStanding(benchmark ? radar : []),

    peak,
    peakImpacts: peak ? (analytics?.peak_game?.impacts ?? []) : [],
  };
}
