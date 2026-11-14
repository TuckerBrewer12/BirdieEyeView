import { useCallback, useMemo, useState } from "react";
import { useAnalytics } from "@/data/useAnalytics";
import { useFriendships } from "@/data/useFriendships";
import { useGoalReport } from "@/data/useGoalReport";
import { useUpdateUser } from "@/data/useUpdateUser";
import { useUser } from "@/data/useUser";
import { messageFrom } from "@/lib/userFacingErrors";
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
} from "./profileModel";
import { useBenchmarkComparison } from "./useBenchmarkComparison";

export type FriendComparison = "no-friends" | "loading" | "no-rounds" | "ready";

export interface ProfileViewModel {
  loading: boolean;
  error: Error | null;
  retry: () => void;

  goal: GoalStanding | null;
  setGoal: (target: number) => void;
  savingGoal: boolean;
  goalSaveError: string | null;

  comparison: ComparisonTargetValue;
  selectedFriend: FriendOption | null;
  pickComparison: (value: ComparisonTargetValue, friendId: string | null) => void;
  friends: FriendOption[];
  friendComparison: FriendComparison | null;
  compared: boolean;
  radar: RadarEntry[];
  standing: RadarStanding;

  peak: PeakGame | null;
  peakImpacts: PeakImpact[];
}

export function useProfileViewModel(
  userId: string,
  active: boolean,
  repository: AnalyticsRepository = analyticsRepository,
  initialFriendId: string | null = null,
): ProfileViewModel {
  const [picked, setPicked] = useState<{ value: ComparisonTargetValue; friendId: string | null } | null>(
    initialFriendId ? { value: "friend", friendId: initialFriendId } : null,
  );

  const { data: user } = useUser(userId, repository);
  const target = user?.scoring_goal ?? null;
  const { data: report } = useGoalReport(userId, target, repository);
  const mine = useAnalytics(active ? userId : null, PROFILE_FILTERS, profileAnalyticsFrom, repository);
  const { data: friendships } = useFriendships(userId, repository);
  const updateUser = useUpdateUser(userId, repository);

  const analytics = mine.data ?? null;
  const peak = useMemo(() => (analytics ? peakGameFrom(analytics, target, report) : null), [analytics, target, report]);

  const friends = useMemo(() => friendOptionsFrom(friendships ?? []), [friendships]);
  const comparison: ComparisonTargetValue = picked?.value ?? analytics?.next_level_handicap ?? null;
  const selectedFriend = friends.find((f) => f.id === picked?.friendId) ?? friends.at(0) ?? null;

  const against = useMemo<BenchmarkTarget | null>(() => {
    if (comparison === "friend") return selectedFriend ? { against: "friend", friendId: selectedFriend.id } : null;
    return comparison != null ? { against: "handicap", handicap: comparison } : null;
  }, [comparison, selectedFriend]);
  const compared = useBenchmarkComparison(userId, against, repository);
  const comparisonData = against ? (compared.data ?? null) : null;
  const benchmark = comparisonData?.benchmark ?? null;

  const radarAll = useMemo(
    () => (analytics ? buildRadarData(analytics.kpis, analytics.scoring_by_par, benchmark, comparisonData?.verdicts) : []),
    [analytics, benchmark, comparisonData],
  );
  const radar = radarAll.filter((entry) => entry.hasData);

  const friendComparison: FriendComparison | null =
    comparison !== "friend"
      ? null
      : !selectedFriend
        ? "no-friends"
        : compared.isLoading
          ? "loading"
          : benchmark
            ? "ready"
            : "no-rounds";

  const { mutate } = updateUser;
  const setGoal = useCallback((next: number) => mutate({ scoring_goal: next }), [mutate]);

  return {
    loading: !active || mine.isLoading,
    error: mine.error,
    retry: () => void mine.refetch(),

    goal: goalStandingFrom(target, report, analytics?.lowestScore ?? null),
    setGoal,
    savingGoal: updateUser.isPending,
    goalSaveError: updateUser.error ? messageFrom(updateUser.error, "Could not save your goal.") : null,

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
