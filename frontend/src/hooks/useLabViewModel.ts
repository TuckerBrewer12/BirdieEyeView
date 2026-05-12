import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { type ComparisonTargetValue } from "@/components/suggestions/ComparisonTargetToggle";
import type { BenchmarkProfile } from "@/components/the-lab/constants";
import { GOAL_OPTIONS, GOAL_BENCHMARK, HANDICAP_BENCHMARK } from "@/components/the-lab/constants";
import { buildRadarData } from "@/components/analytics/UserRadarChart";
import type { AnalyticsData, ScoreTypeRow } from "@/types/analytics";

function toBenchmarkProfile(data: AnalyticsData | undefined): BenchmarkProfile | null {
  if (!data || data.kpis.total_rounds < 1) return null;
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const par3 = data.scoring_by_par.find((row) => row.par === 3 && row.sample_size > 0)?.average_to_par;
  const par4 = data.scoring_by_par.find((row) => row.par === 4 && row.sample_size > 0)?.average_to_par;
  const par5 = data.scoring_by_par.find((row) => row.par === 5 && row.sample_size > 0)?.average_to_par;
  return {
    gir: clamp(data.kpis.gir_percentage ?? 0),
    scrambling: clamp(data.kpis.scrambling_percentage ?? 0),
    putting: clamp(((3.5 - (data.kpis.putts_per_gir ?? 3.5)) / 2) * 100),
    par3: clamp(((2 - (par3 ?? 2)) / 2.5) * 100),
    par4: clamp(((2 - (par4 ?? 2)) / 2.5) * 100),
    par5: clamp(((2 - (par5 ?? 2)) / 2.5) * 100),
  };
}

export interface FriendOption {
  id: string;
  name: string;
}

export interface PeakInsight {
  top: { total_score: number | null; round_index: number; course_name?: string | null; round_id?: string | null }[];
  bestAvg: number;
  overallAvg: number | null | undefined;
  gapToGoal: number;
}

export interface PeakScoreTypes {
  peak: { birdies: number; bogeys: number; doubles: number };
  all: { birdies: number; bogeys: number; doubles: number };
}

export interface LabViewModel {
  userId: string;
  analytics: AnalyticsData | undefined;
  analyticsLoading: boolean;
  currentGoal: number | null;
  setGoal: (value: number) => void;
  settingGoal: boolean;
  radarMode: "benchmark" | "peak";
  setRadarMode: (m: "benchmark" | "peak") => void;
  targetHandicap: ComparisonTargetValue;
  setTargetHandicap: (t: ComparisonTargetValue) => void;
  selectedFriendId: string;
  setSelectedFriendId: (id: string) => void;
  friendOptions: FriendOption[];
  effectiveSelectedFriendId: string;
  selectedFriend: FriendOption | null;
  friendAnalytics: AnalyticsData | undefined;
  friendAnalyticsLoading: boolean;
  comparingFriend: boolean;
  activeProfile: BenchmarkProfile | null;
  peakInsight: PeakInsight | null;
  peakScoreTypes: PeakScoreTypes | null;
  goalLabel: string | null;
  achievedCount: number;
  bestScore: number | null;
  recentTrend: number | null;
  benchmarkHeading: string;
  missingAxes: string[];
}

export function useLabViewModel(userId: string): LabViewModel {
  const queryClient = useQueryClient();
  const [targetHandicap, setTargetHandicap] = useState<ComparisonTargetValue>(null);
  const [radarMode, setRadarMode] = useState<"benchmark" | "peak">("benchmark");
  const [selectedFriendId, setSelectedFriendId] = useState("");

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.getUser(userId),
  });
  const currentGoal = user?.scoring_goal ?? null;

  const { data: goalReport } = useQuery({
    queryKey: ["goal-report", userId],
    queryFn: () => api.getGoalReport(userId, 20),
    enabled: !!currentGoal,
    retry: false,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", userId, { limit: 20 }],
    queryFn: () => api.getAnalytics(userId, { limit: 20, timeframe: "all", courseId: "all" }),
  });

  const { data: acceptedFriendships = [] } = useQuery({
    queryKey: ["friendships", "accepted"],
    queryFn: () => api.getFriendships("accepted"),
  });

  const friendOptions = useMemo<FriendOption[]>(() => {
    const deduped = new Map<string, string>();
    for (const friendship of acceptedFriendships) {
      const isRequester = friendship.requester_id === userId;
      const friendId = isRequester ? friendship.addressee_id : friendship.requester_id;
      if (!friendId || friendId === userId) continue;
      const friendName = (isRequester ? friendship.addressee_name : friendship.requester_name) || "Unknown user";
      if (!deduped.has(friendId)) deduped.set(friendId, friendName);
    }
    return [...deduped.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [acceptedFriendships, userId]);

  const effectiveSelectedFriendId = useMemo(() => {
    if (friendOptions.some((f) => f.id === selectedFriendId)) return selectedFriendId;
    return friendOptions[0]?.id ?? "";
  }, [friendOptions, selectedFriendId]);

  const selectedFriend = useMemo(
    () => friendOptions.find((f) => f.id === effectiveSelectedFriendId) ?? null,
    [effectiveSelectedFriendId, friendOptions],
  );

  const comparingFriend = radarMode === "benchmark" && targetHandicap === "friend";

  const { data: friendAnalytics, isLoading: friendAnalyticsLoading } = useQuery({
    queryKey: ["analytics", "friend-compare", effectiveSelectedFriendId, { limit: 20 }],
    queryFn: () => api.getAnalytics(effectiveSelectedFriendId, { limit: 20, timeframe: "all", courseId: "all" }),
    enabled: comparingFriend && !!effectiveSelectedFriendId,
  });

  const { mutate: setGoal, isPending: settingGoal } = useMutation({
    mutationFn: (value: number) => api.updateUser(userId, { scoring_goal: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
      queryClient.invalidateQueries({ queryKey: ["goal-report", userId] });
    },
  });

  const benchmarkProfile = useMemo<BenchmarkProfile | null>(() => {
    if (typeof targetHandicap === "number") return HANDICAP_BENCHMARK[targetHandicap] ?? null;
    return null;
  }, [targetHandicap]);

  const friendProfile = useMemo<BenchmarkProfile | null>(
    () => toBenchmarkProfile(friendAnalytics),
    [friendAnalytics],
  );

  const peakInsight = useMemo<PeakInsight | null>(() => {
    if (!currentGoal || !analytics?.score_trend) return null;
    const valid = analytics.score_trend
      .filter((r) => r.total_score != null)
      .sort((a, b) => a.total_score! - b.total_score!);
    if (valid.length < 2) return null;
    const top = valid.slice(0, Math.min(3, valid.length));
    const bestAvg = top.reduce((s, r) => s + r.total_score!, 0) / top.length;
    const overallAvg = analytics.kpis.scoring_average;
    const gapToGoal = bestAvg - currentGoal;
    return { top, bestAvg, overallAvg, gapToGoal };
  }, [analytics, currentGoal]);

  const peakProfile = useMemo<BenchmarkProfile | null>(() => {
    if (!peakInsight) return null;
    const thresholds = [71, 74, 79, 84, 89, 94, 99] as const;
    const nearest = thresholds.reduce((a, b) =>
      Math.abs(b - peakInsight.bestAvg) < Math.abs(a - peakInsight.bestAvg) ? b : a,
    );
    return GOAL_BENCHMARK[nearest];
  }, [peakInsight]);

  const peakScoreTypes = useMemo<PeakScoreTypes | null>(() => {
    if (!peakInsight || !analytics?.score_type_distribution?.length) return null;
    const peakIds = new Set(peakInsight.top.map((r) => r.round_id).filter(Boolean));
    const peakRows = analytics.score_type_distribution.filter((r) => r.round_id && peakIds.has(r.round_id));
    const allRows = analytics.score_type_distribution;
    if (!peakRows.length) return null;

    const avgCount = (rows: ScoreTypeRow[], key: keyof ScoreTypeRow) =>
      rows.reduce((s, r) => s + ((r[key] as number) / 100) * r.holes_counted, 0) / rows.length;
    const doublesPlus = (rows: ScoreTypeRow[]) =>
      rows.reduce((s, r) => s + ((r.double_bogey + r.triple_bogey + r.quad_bogey) / 100) * r.holes_counted, 0) / rows.length;

    return {
      peak: {
        birdies: avgCount(peakRows, "birdie"),
        bogeys: avgCount(peakRows, "bogey"),
        doubles: doublesPlus(peakRows),
      },
      all: {
        birdies: avgCount(allRows, "birdie"),
        bogeys: avgCount(allRows, "bogey"),
        doubles: doublesPlus(allRows),
      },
    };
  }, [peakInsight, analytics]);

  const activeProfile = useMemo<BenchmarkProfile | null>(() => {
    if (radarMode === "peak") return peakProfile;
    if (targetHandicap === "friend") return friendProfile;
    return benchmarkProfile;
  }, [radarMode, targetHandicap, peakProfile, friendProfile, benchmarkProfile]);

  const missingAxes = useMemo(() => {
    if (!analytics?.kpis) return [];
    const profile = activeProfile ?? { gir: 0, scrambling: 0, putting: 0, par3: 0, par4: 0, par5: 0 };
    return buildRadarData(analytics.kpis, analytics.scoring_by_par ?? [], profile)
      .filter((e) => !e.hasData)
      .map((e) => e.axis);
  }, [analytics, activeProfile]);

  const goalLabel = GOAL_OPTIONS.find((o) => o.value === currentGoal)?.label ?? null;

  const achievedCount = useMemo(() => {
    if (!analytics?.score_trend || !currentGoal) return 0;
    return analytics.score_trend.filter(
      (r) => r.total_score != null && r.total_score <= currentGoal,
    ).length;
  }, [analytics, currentGoal]);

  const bestScore = useMemo(() => {
    if (goalReport?.best_score != null) return goalReport.best_score;
    const scores = (analytics?.score_trend ?? [])
      .map((r) => r.total_score)
      .filter((s): s is number => s != null);
    return scores.length ? Math.min(...scores) : null;
  }, [analytics, goalReport]);

  const recentTrend = useMemo(() => {
    const valid = (analytics?.score_trend ?? []).filter((r) => r.total_score != null);
    if (valid.length < 5) return null;
    const recent5 = valid.slice(-5).reduce((s, r) => s + r.total_score!, 0) / 5;
    const overall = analytics!.kpis.scoring_average;
    if (overall == null) return null;
    return +(recent5 - overall).toFixed(1);
  }, [analytics]);

  const benchmarkHeading = useMemo(() => {
    if (radarMode === "peak") return peakInsight ? `You vs. Your Peak Game (avg ${peakInsight.bestAvg.toFixed(1)})` : "Peak Game";
    if (targetHandicap === "friend") return selectedFriend ? `You vs. ${selectedFriend.name}` : "You vs. Friend";
    if (targetHandicap === 0)  return "You vs. Scratch";
    if (targetHandicap === 5)  return "You vs. Break-80 Shape";
    if (targetHandicap === 10) return "You vs. Break-85 Shape";
    if (targetHandicap === 15) return "You vs. Break-90 Shape";
    if (targetHandicap === 20) return "You vs. Break-95 Shape";
    if (targetHandicap === 25) return "You vs. Break-100 Shape";
    return "Your Performance Shape";
  }, [radarMode, targetHandicap, peakInsight, selectedFriend]);

  // Sync compactRadarLayout is desktop-only and stays in the layout component.
  // This effect is kept here only if needed cross-layout; currently it is desktop-only.

  return {
    userId,
    analytics,
    analyticsLoading,
    currentGoal,
    setGoal,
    settingGoal,
    radarMode,
    setRadarMode,
    targetHandicap,
    setTargetHandicap,
    selectedFriendId,
    setSelectedFriendId,
    friendOptions,
    effectiveSelectedFriendId,
    selectedFriend,
    friendAnalytics,
    friendAnalyticsLoading,
    comparingFriend,
    activeProfile,
    peakInsight,
    peakScoreTypes,
    goalLabel,
    achievedCount,
    bestScore,
    recentTrend,
    benchmarkHeading,
    missingAxes,
  };
}
