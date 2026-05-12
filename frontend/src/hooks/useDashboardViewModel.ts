import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { SCORE_COLORS, SCORE_KEYS, SCORE_LABELS } from "@/lib/colors";
import type { Milestone, DashboardData } from "@/types/golf";
import type { AnalyticsData, GoalReport } from "@/types/analytics";

export interface DualTrendPoint {
  round_index: number;
  total_score: number | null;
  to_par: number | null;
  handicap_index: number | null;
  course_name?: string | null;
  used_in_hi?: boolean | null;
  differential?: number | null;
  hi_threshold?: number | null;
}

export interface ScoreDistItem {
  name: string;
  label: string;
  value: number;
  color: string;
}

export interface DashboardViewModel {
  data: DashboardData | null;
  trends: AnalyticsData | null;
  user: Awaited<ReturnType<typeof api.getUser>> | null | undefined;
  goalReport: GoalReport | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  dualData: DualTrendPoint[];
  recentMilestones: Milestone[];
  last20ScoringAvg: number | null;
  hiTrend: "up" | "down" | "flat" | null;
  girPct: number;
  girDonutData: { value: number }[];
  recentDistribution: ScoreDistItem[];
  scramblingPct: number | null;
  upAndDownPct: number | null;
  putts: number;
  puttsClamped: number;
  puttsGaugeData: { value: number }[];
  puttsColor: string;
  scoreColors: Record<string, string>;
  scoreLineColor: string;
  handicapLineColor: string;
  girColor: string;
  warningColor: string;
  dangerColor: string;
  gridColor: string;
  mutedFill: string;
}

export function useDashboardViewModel(userId: string): DashboardViewModel {
  const { data: fetched, isLoading: loading, error, refetch } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      const [dashboardResult, analyticsResult] = await Promise.allSettled([
        api.getDashboard(userId),
        api.getAnalytics(userId, { limit: 20, timeframe: "all", courseId: "all" }),
      ]);
      if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;
      return [
        dashboardResult.value,
        analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
      ] as const;
    },
  });

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.getUser(userId),
  });

  const { data: goalReport } = useQuery({
    queryKey: ["goal-report", userId],
    queryFn: () => api.getGoalReport(userId, 20),
    enabled: !!user?.scoring_goal,
    retry: false,
  });

  const data = fetched?.[0] ?? null;
  const trends = fetched?.[1] ?? null;

  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);
  const scoreColors = (colorBlindPalette?.score ?? SCORE_COLORS) as Record<string, string>;
  const scoreLineColor = colorBlindPalette?.trend.primary ?? "#2d7a3a";
  const handicapLineColor = colorBlindPalette?.trend.secondary ?? "#60a5fa";
  const girColor = colorBlindPalette?.ui.success ?? "#059669";
  const warningColor = colorBlindPalette?.ui.warning ?? "#f59e0b";
  const dangerColor = colorBlindPalette?.ui.danger ?? "#ef4444";
  const gridColor = colorBlindPalette?.ui.grid ?? "#d1d5db";
  const mutedFill = colorBlindPalette?.ui.mutedFill ?? "#f1f5f9";

  const recentMilestones = useMemo<Milestone[]>(() => {
    if (!trends) return [];
    const a = trends.notable_achievements;
    const normalizeDate = (raw: string) => raw.split("T")[0].replace(/-/g, "/");

    const scoreBest = a.round_milestones.lifetime.first_round_under_par
      ? {
          type: "score_break" as const,
          label: `First round under par (${a.round_milestones.lifetime.first_round_under_par.score})`,
          date: normalizeDate(a.round_milestones.lifetime.first_round_under_par.date),
          course: a.round_milestones.lifetime.first_round_under_par.course,
        }
      : (() => {
          const best = a.round_milestones.lifetime.score_breaks
            .filter((r) => r.achievement != null)
            .reduce<typeof a.round_milestones.lifetime.score_breaks[number] | null>(
              (c, r) => (!c || r.threshold < c.threshold ? r : c),
              null,
            );
          return best?.achievement
            ? {
                type: "score_break" as const,
                label: `Best score: ${best.threshold} or better`,
                date: normalizeDate(best.achievement.date),
                course: best.achievement.course,
              }
            : null;
        })();

    const puttingBest = (() => {
      const best = a.putting_milestones.lifetime.putt_breaks
        .filter((r) => r.achievement != null)
        .reduce<typeof a.putting_milestones.lifetime.putt_breaks[number] | null>(
          (c, r) => (!c || r.threshold < c.threshold ? r : c),
          null,
        );
      return best?.achievement
        ? {
            type: "putt_break" as const,
            label: `Fewest putts: ${best.threshold}`,
            date: normalizeDate(best.achievement.date),
            course: best.achievement.course,
          }
        : null;
    })();

    const parStreakEvent = a.best_performance_streaks_events.lifetime.longest_par_streak;
    const parStreak = parStreakEvent
      ? {
          type: "par_streak" as const,
          label: `Par streak: ${a.best_performance_streaks.lifetime.longest_par_streak} in a row`,
          date: normalizeDate(parStreakEvent.date),
          course: parStreakEvent.course,
        }
      : null;

    return ([scoreBest, puttingBest, parStreak] as Array<Milestone | null>)
      .filter((m): m is Milestone => m !== null)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [trends]);

  const dualData = useMemo<DualTrendPoint[]>(() => {
    if (!trends) return [];
    return trends.score_trend.map((row, i) => ({
      ...row,
      handicap_index: trends.handicap_trend[i]?.handicap_index ?? null,
      used_in_hi: trends.handicap_trend[i]?.used_in_hi ?? null,
      differential: trends.handicap_trend[i]?.differential ?? null,
      hi_threshold: trends.handicap_trend[i]?.hi_threshold ?? null,
    }));
  }, [trends]);

  const recentDistribution = useMemo<ScoreDistItem[]>(() => {
    if (!trends) return [];
    const last5 = (trends.score_type_distribution ?? []).slice(-5);
    if (!last5.length) return [];
    let total = 0;
    const sums: Record<string, number> = {};
    for (const row of last5) {
      total += row.holes_counted;
      for (const key of SCORE_KEYS) {
        sums[key] = (sums[key] ?? 0) + ((row[key] as number) / 100) * row.holes_counted;
      }
    }
    return SCORE_KEYS.map((key) => ({
      name: key,
      label: SCORE_LABELS[key] as string,
      value: total > 0 ? Math.round((sums[key] / total) * 1000) / 10 : 0,
      color: scoreColors[key],
    })).filter((d) => d.value > 0);
  }, [trends, scoreColors]);

  const last20ScoringAvg = useMemo(() => {
    const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + r.total_score!, 0) / valid.length;
  }, [trends]);

  const hiTrend = useMemo(() => {
    if (!trends) return null;
    const valid = trends.handicap_trend.filter((r) => r.handicap_index != null);
    if (valid.length < 3) return null;
    const diff = valid[0].handicap_index! - valid[valid.length - 1].handicap_index!;
    if (Math.abs(diff) < 0.3) return "flat" as const;
    return diff > 0 ? "down" as const : "up" as const;
  }, [trends]);

  const girPct = useMemo(() => {
    const rows = (trends?.gir_trend ?? [])
      .slice(-5)
      .filter((r) => r.total_gir != null && r.holes_played > 0);
    if (!rows.length) return Math.max(0, Math.min(100, trends?.kpis.gir_percentage ?? 0));
    const totalGir = rows.reduce((s, r) => s + (r.total_gir ?? 0), 0);
    const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
    return Math.max(0, Math.min(100, (totalGir / totalHoles) * 100));
  }, [trends]);

  const scramblingPct = useMemo(() => {
    const rows = (trends?.scrambling_trend ?? []).slice(-5);
    const opps = rows.reduce((s, r) => s + r.scramble_opportunities, 0);
    const succ = rows.reduce((s, r) => s + r.scramble_successes, 0);
    return opps > 0 ? (succ / opps) * 100 : null;
  }, [trends]);

  const upAndDownPct = useMemo(() => {
    const rows = (trends?.up_and_down_trend ?? []).slice(-5);
    const opps = rows.reduce((s, r) => s + r.opportunities, 0);
    const succ = rows.reduce((s, r) => s + r.successes, 0);
    return opps > 0 ? (succ / opps) * 100 : null;
  }, [trends]);

  const girDonutData = useMemo(
    () => [{ value: girPct }, { value: 100 - girPct }],
    [girPct],
  );

  const putts = useMemo(() => {
    const rows = (trends?.putts_trend ?? [])
      .slice(-5)
      .filter((r) => r.total_putts != null && r.holes_played > 0);
    if (!rows.length) return data?.average_putts ?? 36;
    const totalPutts = rows.reduce((s, r) => s + (r.total_putts ?? 0), 0);
    const totalHoles = rows.reduce((s, r) => s + r.holes_played, 0);
    return totalHoles > 0 ? (totalPutts / totalHoles) * 18 : (data?.average_putts ?? 36);
  }, [trends, data?.average_putts]);

  const puttsClamped = useMemo(() => Math.max(20, Math.min(40, putts)), [putts]);
  const puttsGaugeData = useMemo(
    () => [{ value: puttsClamped - 20 }, { value: 20 }],
    [puttsClamped],
  );
  const puttsColor =
    putts < 30
      ? (colorBlindPalette?.ui.success ?? "#16a34a")
      : putts <= 35
        ? warningColor
        : dangerColor;

  return {
    data,
    trends,
    user: user ?? null,
    goalReport: goalReport ?? null,
    loading,
    error: error as Error | null,
    refetch,
    dualData,
    recentMilestones,
    last20ScoringAvg,
    hiTrend,
    girPct,
    girDonutData,
    recentDistribution,
    scramblingPct,
    upAndDownPct,
    putts,
    puttsClamped,
    puttsGaugeData,
    puttsColor,
    scoreColors,
    scoreLineColor,
    handicapLineColor,
    girColor,
    warningColor,
    dangerColor,
    gridColor,
    mutedFill,
  };
}
