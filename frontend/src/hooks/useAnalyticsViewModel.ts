import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { SCORE_COLORS, SCORE_KEYS } from "@/lib/colors";
import { withRollingAverage } from "@/lib/stats";
import type {
  AnalyticsData, AnalyticsFilters, ScoreTrendRow, ScoreTypeRow, GIRTrendRow, PuttsTrendRow, ThreePuttRow,
} from "@/types/analytics";

const DEFAULT_FILTERS: AnalyticsFilters = { limit: 50, timeframe: "all", courseId: "all" };

type InsightCategory = "scoring" | "gir" | "putting";

export interface Insight {
  text: string;
  trend?: "up" | "down" | "flat";
  positiveUp?: boolean;
  category: InsightCategory;
}

function aggregateDonut(dist: ScoreTypeRow[]) {
  const filtered = dist.filter((r) => r.holes_counted > 0);
  if (!filtered.length) return [];
  let total = 0;
  const sums: Record<string, number> = {};
  for (const row of filtered) {
    total += row.holes_counted;
    for (const key of SCORE_KEYS) {
      sums[key] = (sums[key] ?? 0) + ((row[key] as number) / 100) * row.holes_counted;
    }
  }
  return SCORE_KEYS.map((key) => ({
    name: key,
    value: total > 0 ? Math.round((sums[key] / total) * 1000) / 10 : 0,
  })).filter((d) => d.value > 0);
}

function computeInsights(
  scoreTrend: ScoreTrendRow[],
  girTrend: GIRTrendRow[],
  scoringByPar: { par: number; average_to_par: number; sample_size: number }[],
  puttsTrend: PuttsTrendRow[],
): Insight[] {
  const out: Insight[] = [];

  if (scoreTrend.length >= 6) {
    const mid = Math.floor(scoreTrend.length / 2);
    const first = scoreTrend.slice(0, mid).filter((r) => r.total_score != null).map((r) => r.total_score!);
    const last  = scoreTrend.slice(mid).filter((r) => r.total_score != null).map((r) => r.total_score!);
    if (first.length && last.length) {
      const diff = (first.reduce((a, b) => a + b, 0) / first.length) - (last.reduce((a, b) => a + b, 0) / last.length);
      if (Math.abs(diff) >= 0.3) {
        out.push({
          category: "scoring",
          text: diff > 0
            ? `Your scoring average has improved by ${Math.abs(diff).toFixed(1)} strokes over the last ${scoreTrend.length} rounds.`
            : `Your scoring average has climbed by ${Math.abs(diff).toFixed(1)} strokes recently — worth monitoring.`,
          trend: diff > 0 ? "down" : "up",
          positiveUp: false,
        });
      }
    }
  }

  if (scoringByPar.length) {
    const best = [...scoringByPar].sort((a, b) => a.average_to_par - b.average_to_par)[0];
    out.push({
      category: "scoring",
      text: `You score best on par ${best.par}s — averaging ${best.average_to_par > 0 ? "+" : ""}${best.average_to_par.toFixed(2)} across ${best.sample_size} holes.`,
      trend: best.average_to_par <= 0 ? "down" : "flat",
      positiveUp: false,
    });
  }

  const girWithData = girTrend.filter((r) => r.gir_percentage != null);
  if (girWithData.length >= 1) {
    const avgGIR = girWithData.reduce((a, r) => a + r.gir_percentage!, 0) / girWithData.length;
    out.push({
      category: "gir",
      text: avgGIR >= 55
        ? `Your average GIR% is ${avgGIR.toFixed(1)}% — excellent ball striking.`
        : avgGIR >= 33
        ? `Your average GIR% is ${avgGIR.toFixed(1)}% — improving this is one of the fastest routes to lower scores.`
        : `Your average GIR% is ${avgGIR.toFixed(1)}% — irons are the area to target for the biggest scoring gains.`,
      trend: avgGIR >= 50 ? "up" : "flat",
      positiveUp: true,
    });
  }

  if (girWithData.length >= 4) {
    const mid = Math.floor(girWithData.length / 2);
    const first3 = girWithData.slice(0, mid);
    const last3  = girWithData.slice(mid);
    const diff = (last3.reduce((a, r) => a + r.gir_percentage!, 0) / last3.length)
               - (first3.reduce((a, r) => a + r.gir_percentage!, 0) / first3.length);
    if (Math.abs(diff) >= 1) {
      out.push({
        category: "gir",
        text: diff > 0
          ? `GIR% trending up ${Math.abs(diff).toFixed(0)} points over recent rounds — ball striking improving.`
          : `GIR% has dipped ${Math.abs(diff).toFixed(0)} points recently — iron consistency worth a look.`,
        trend: diff > 0 ? "up" : "down",
        positiveUp: true,
      });
    }
  }

  const puttsWithData = puttsTrend.filter((r) => r.total_putts != null);
  if (puttsWithData.length >= 1) {
    const avgPutts = puttsWithData.reduce((a, r) => a + r.total_putts!, 0) / puttsWithData.length;
    out.push({
      category: "putting",
      text: avgPutts <= 30
        ? `Averaging ${avgPutts.toFixed(1)} putts per round — outstanding on the green.`
        : avgPutts <= 34
        ? `Averaging ${avgPutts.toFixed(1)} putts per round — solid putting.`
        : `Averaging ${avgPutts.toFixed(1)} putts per round — reducing three-putts is the fastest path to lower scores.`,
      trend: avgPutts <= 32 ? "down" : avgPutts <= 36 ? "flat" : "up",
      positiveUp: false,
    });
  }

  if (puttsWithData.length >= 4) {
    const mid = Math.floor(puttsWithData.length / 2);
    const firstPutts = puttsWithData.slice(0, mid).map((r) => r.total_putts!);
    const lastPutts  = puttsWithData.slice(mid).map((r) => r.total_putts!);
    const diff = (firstPutts.reduce((a, b) => a + b, 0) / firstPutts.length)
               - (lastPutts.reduce((a, b) => a + b, 0) / lastPutts.length);
    if (Math.abs(diff) >= 0.5) {
      out.push({
        category: "putting",
        text: diff > 0
          ? `Putts per round improving — down ${Math.abs(diff).toFixed(1)} strokes on average.`
          : `Putts per round up ${Math.abs(diff).toFixed(1)} strokes recently.`,
        trend: diff > 0 ? "down" : "up",
        positiveUp: false,
      });
    }
  }

  return out;
}

export interface AnalyticsViewModel {
  data: AnalyticsData | undefined;
  loading: boolean;
  filters: AnalyticsFilters;
  setFilters: (f: AnalyticsFilters) => void;
  playedCourses: { id: string; name: string | null; location: string | null }[];
  hasHomeCourse: boolean;
  isEmpty: boolean;
  isFiltered: boolean;
  safeKpis: (AnalyticsData["kpis"] & { gir_percentage: number | null; scrambling_percentage: number | null }) | null;
  scoreTrendWithAvg: (ScoreTrendRow & { rolling_avg: number | null })[];
  donutData: { name: string; value: number }[];
  girData: GIRTrendRow[];
  threePuttsData: ThreePuttRow[];
  insights: Insight[];
  bestRound: ScoreTrendRow | null;
  avgPutts: string | null;
  divergingGirData: Record<string, string | number>[];
  trendPrimary: string;
  trendSecondary: string;
  trendTertiary: string;
  successColor: string;
  dangerColor: string;
  neutralColor: string;
  gridColor: string;
  mutedFill: string;
  scoreColors: Record<string, string>;
}

export function useAnalyticsViewModel(userId: string): AnalyticsViewModel {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["analytics", userId, filters],
    queryFn: () => api.getAnalytics(userId, filters),
  });

  const { data: playedCourses = [] } = useQuery({
    queryKey: ["played-courses", userId],
    queryFn: () => api.getPlayedCourses(userId),
  });

  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.getUser(userId),
  });

  const colorBlindMode    = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);
  const scoreColors    = (colorBlindPalette?.score ?? SCORE_COLORS) as Record<string, string>;
  const trendPrimary   = colorBlindPalette?.trend.primary   ?? "#2d7a3a";
  const trendSecondary = colorBlindPalette?.trend.secondary ?? "#f97316";
  const trendTertiary  = colorBlindPalette?.trend.tertiary  ?? "#a855f7";
  const successColor   = colorBlindPalette?.ui.success   ?? "#059669";
  const dangerColor    = colorBlindPalette?.ui.danger    ?? "#f87171";
  const neutralColor   = colorBlindPalette?.ui.neutral   ?? "#6b7280";
  const gridColor      = colorBlindPalette?.ui.grid      ?? "#f1f5f1";
  const mutedFill      = colorBlindPalette?.ui.mutedFill ?? "#e5e7eb";

  const isEmpty = !data || data.kpis.total_rounds === 0;
  const isFiltered = filters.courseId !== "all" || filters.timeframe !== "all";
  const hasHomeCourse = !!user?.home_course_id;

  const scoreTrendWithAvg = useMemo(
    () => withRollingAverage(data?.score_trend ?? [], (r) => r.total_score),
    [data?.score_trend],
  );

  const donutData = useMemo(
    () => aggregateDonut(data?.score_type_distribution?.filter((r) => r.holes_counted > 0) ?? []),
    [data?.score_type_distribution],
  );

  const girData = useMemo(
    () => (data?.gir_trend ?? []).filter((r) => r.gir_percentage != null && r.total_gir != null),
    [data?.gir_trend],
  );

  const threePuttsData = useMemo(() => {
    const roundsWithPutts = new Set(
      (data?.putts_trend ?? []).filter((r) => r.total_putts != null).map((r) => r.round_id),
    );
    return (data?.three_putts_trend ?? []).filter((r) => roundsWithPutts.has(r.round_id));
  }, [data?.three_putts_trend, data?.putts_trend]);

  const insights = useMemo(
    () => computeInsights(
      data?.score_trend ?? [],
      data?.gir_trend ?? [],
      data?.scoring_by_par ?? [],
      data?.putts_trend ?? [],
    ),
    [data?.score_trend, data?.gir_trend, data?.scoring_by_par, data?.putts_trend],
  );

  const bestRound = useMemo(() => {
    const valid = (data?.score_trend ?? []).filter((r) => r.total_score != null);
    return valid.length ? valid.reduce((b, r) => (r.total_score! < b.total_score! ? r : b)) : null;
  }, [data?.score_trend]);

  const avgPutts = useMemo(() => {
    const valid = (data?.putts_trend ?? []).filter((r) => r.total_putts != null).map((r) => r.total_putts!);
    if (!valid.length) return null;
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
  }, [data?.putts_trend]);

  const safeKpis = useMemo(() => {
    if (!data) return null;
    const safeGirPct = girData.length > 0
      ? Math.round(girData.reduce((a, r) => a + (r.gir_percentage ?? 0), 0) / girData.length * 10) / 10
      : null;
    const scramblingValid = data.scrambling_trend.filter((r) => r.scrambling_percentage != null);
    const safeScrambling = scramblingValid.length > 0
      ? Math.round(scramblingValid.reduce((a, r) => a + r.scrambling_percentage, 0) / scramblingValid.length * 10) / 10
      : null;
    return { ...data.kpis, gir_percentage: safeGirPct, scrambling_percentage: safeScrambling };
  }, [data, girData]);

  const divergingGirData = useMemo(() => {
    return (data?.gir_vs_non_gir ?? []).map((row) => ({
      bucket:    row.bucket,
      "Birdie":  -(row.birdie ?? 0),
      "Eagle":   -(row.eagle ?? 0),
      "Par":      row.par ?? 0,
      "Bogey":    row.bogey ?? 0,
      "Double":   row.double_bogey ?? 0,
      "Triple+": (row.triple_bogey ?? 0) + (row.quad_bogey ?? 0),
    }));
  }, [data?.gir_vs_non_gir]);

  return {
    data,
    loading,
    filters,
    setFilters,
    playedCourses,
    hasHomeCourse,
    isEmpty,
    isFiltered,
    safeKpis,
    scoreTrendWithAvg,
    donutData,
    girData,
    threePuttsData,
    insights,
    bestRound,
    avgPutts,
    divergingGirData,
    trendPrimary,
    trendSecondary,
    trendTertiary,
    successColor,
    dangerColor,
    neutralColor,
    gridColor,
    mutedFill,
    scoreColors,
  };
}
