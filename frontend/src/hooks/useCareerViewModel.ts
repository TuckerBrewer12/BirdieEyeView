import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { SCORE_COLORS, SCORE_KEYS } from "@/lib/colors";
import type { AnalyticsData, MilestoneEvent, ScoreTypeRow } from "@/types/analytics";

export type TimeWindow = "lifetime" | "one_year";

export interface RecordRow {
  label: string;
  value: number | null;
  meta: string | null;
  roundId?: string | null;
}

export interface ScoreBreak {
  threshold: number;
  achievement: { date: string; course: string; round_id?: string | null } | null;
}

function eventMeta(event: MilestoneEvent | null | undefined): string | null {
  if (!event) return null;
  return `${event.date} — ${event.course}`;
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

export interface CareerViewModel {
  data: AnalyticsData | undefined;
  loading: boolean;
  timeWindow: TimeWindow;
  setTimeWindow: (w: TimeWindow) => void;
  donutData: { name: string; value: number }[];
  recordRows: RecordRow[];
  scoreBreaksAbove70: ScoreBreak[];
  scoreBreaks70AndBelow: ScoreBreak[];
  totalHoles: number;
  gaugeData: { value: number }[];
  hiColor: string;
  hiDisplay: string;
  trendPrimary: string;
  successColor: string;
  warningColor: string;
  dangerColor: string;
  neutralColor: string;
  gridColor: string;
  mutedFill: string;
  scoreColors: Record<string, string>;
}

export function useCareerViewModel(userId: string): CareerViewModel {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("lifetime");

  const { data, isLoading: loading } = useQuery({
    queryKey: ["career-analytics", userId],
    queryFn: () => api.getAnalytics(userId, 200),
  });

  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);
  const scoreColors = (colorBlindPalette?.score ?? SCORE_COLORS) as Record<string, string>;
  const trendPrimary = colorBlindPalette?.trend.primary ?? "#2d7a3a";
  const successColor = colorBlindPalette?.ui.success ?? "#16a34a";
  const warningColor = colorBlindPalette?.ui.warning ?? "#f59e0b";
  const dangerColor = colorBlindPalette?.ui.danger ?? "#ef4444";
  const neutralColor = colorBlindPalette?.ui.neutral ?? "#9ca3af";
  const gridColor = colorBlindPalette?.ui.grid ?? "#f1f5f9";
  const mutedFill = colorBlindPalette?.ui.mutedFill ?? "#f1f5f9";

  const donutData = useMemo(
    () => aggregateDonut(data?.score_type_distribution ?? []),
    [data?.score_type_distribution],
  );

  const hi = Math.max(0, Math.min(36, data?.kpis.handicap_index ?? 18));
  const gaugeData = [{ value: hi }, { value: 36 - hi }];
  const hiColor = hi < 10 ? successColor : hi < 20 ? warningColor : dangerColor;
  const hiDisplay =
    data?.kpis.handicap_index != null
      ? data.kpis.handicap_index < 0
        ? `+${Math.abs(data.kpis.handicap_index)}`
        : data.kpis.handicap_index.toFixed(1)
      : "—";

  const w = timeWindow;

  const recordRows = useMemo<RecordRow[]>(() => {
    if (!data) return [];
    const { scoring_records, best_performance_streaks, best_performance_streaks_events, scoring_records_events } = data.notable_achievements;
    return [
      {
        label: "Lowest Round",
        value: scoring_records[w].lowest_round,
        meta: eventMeta(scoring_records_events[w].lowest_round),
        roundId: scoring_records_events[w].lowest_round?.round_id,
      },
      {
        label: "Most Birdies",
        value: scoring_records[w].most_birdies_in_round,
        meta: eventMeta(scoring_records_events[w].most_birdies_in_round),
        roundId: scoring_records_events[w].most_birdies_in_round?.round_id,
      },
      {
        label: "Most GIR",
        value: scoring_records[w].most_gir_in_round,
        meta: eventMeta(scoring_records_events[w].most_gir_in_round),
        roundId: scoring_records_events[w].most_gir_in_round?.round_id,
      },
      {
        label: "Fewest Putts",
        value: scoring_records[w].fewest_putts_in_round,
        meta: eventMeta(scoring_records_events[w].fewest_putts_in_round),
        roundId: scoring_records_events[w].fewest_putts_in_round?.round_id,
      },
      {
        label: "Birdie Streak",
        value: best_performance_streaks[w].longest_birdie_streak,
        meta: eventMeta(best_performance_streaks_events[w].longest_birdie_streak),
        roundId: best_performance_streaks_events[w].longest_birdie_streak?.round_id,
      },
      {
        label: "Par-or-Better Streak",
        value: best_performance_streaks[w].longest_par_streak,
        meta: eventMeta(best_performance_streaks_events[w].longest_par_streak),
        roundId: best_performance_streaks_events[w].longest_par_streak?.round_id,
      },
    ];
  }, [data, w]);

  const scoreBreaksAbove70 = useMemo<ScoreBreak[]>(
    () => (data?.notable_achievements.round_milestones.lifetime.score_breaks ?? []).filter((row) => row.threshold > 70),
    [data],
  );
  const scoreBreaks70AndBelow = useMemo<ScoreBreak[]>(
    () => (data?.notable_achievements.round_milestones.lifetime.score_breaks ?? []).filter((row) => row.threshold <= 70),
    [data],
  );

  const totalHoles = data?.notable_achievements.career_totals.lifetime.total_holes_played ?? 0;

  return {
    data,
    loading,
    timeWindow,
    setTimeWindow,
    donutData,
    recordRows,
    scoreBreaksAbove70,
    scoreBreaks70AndBelow,
    totalHoles,
    gaugeData,
    hiColor,
    hiDisplay,
    trendPrimary,
    successColor,
    warningColor,
    dangerColor,
    neutralColor,
    gridColor,
    mutedFill,
    scoreColors,
  };
}
