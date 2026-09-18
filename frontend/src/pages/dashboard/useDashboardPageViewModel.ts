import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette, type ChartPalette } from "@/lib/chartPalettes";
import {
  SCORE_KEYS,
  colors,
  scoreKeyFor,
  toParDisplay,
  toParFill,
  toParTone,
  type ScoreKey,
} from "@/brand/theme";
import { formatHandicapIndex, whsWindow } from "@/domain/handicap";
import { holePar } from "@/domain/round";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateShort } from "@/lib/roundDate";
import type { Milestone, DashboardData, Round, RoundSummary, User } from "@/types/golf";
import type { AnalyticsData, GoalReport, ScoreTypeRow } from "@/types/analytics";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./dashboardRepository";

export type TrendView = "score" | "hcp";

/** Analytics payload names → brand `ScoreKey`. */
const ANALYTICS_SCORE_FIELDS = [
  "eagle",
  "birdie",
  "par",
  "bogey",
  "double_bogey",
  "triple_bogey",
  "quad_bogey",
] as const;

type AnalyticsScoreField = (typeof ANALYTICS_SCORE_FIELDS)[number];

const ANALYTICS_TO_BRAND: Record<AnalyticsScoreField, ScoreKey> = {
  eagle: "eagle",
  birdie: "birdie",
  par: "par",
  bogey: "bogey",
  double_bogey: "double",
  triple_bogey: "triple",
  quad_bogey: "quad",
};

const SCORE_LABELS: Record<ScoreKey, string> = {
  eagle: "Eagle+",
  birdie: "Birdie",
  par: "Par",
  bogey: "Bogey",
  double: "Double",
  triple: "Triple",
  quad: "Quad+",
};

function scoreColorsFromPalette(
  palette: ChartPalette["score"] | null | undefined,
): Record<ScoreKey, string> {
  return {
    eagle: palette?.eagle ?? colors.score.eagle.base,
    birdie: palette?.birdie ?? colors.score.birdie.base,
    par: palette?.par ?? colors.score.par.base,
    bogey: palette?.bogey ?? colors.score.bogey.base,
    double: palette?.double_bogey ?? colors.score.double.base,
    triple: palette?.triple_bogey ?? colors.score.triple.base,
    quad: palette?.quad_bogey ?? colors.score.quad.base,
  };
}

function mixFromRows(
  rows: ScoreTypeRow[],
  scoreColors: Record<ScoreKey, string>,
  roundTenths: boolean,
): ScoreDistItem[] {
  let total = 0;
  const sums: Record<ScoreKey, number> = {
    eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0,
  };
  for (const row of rows) {
    total += row.holes_counted;
    for (const field of ANALYTICS_SCORE_FIELDS) {
      sums[ANALYTICS_TO_BRAND[field]] += (row[field] / 100) * row.holes_counted;
    }
  }
  return SCORE_KEYS.map((key) => {
    const raw = total > 0 ? (sums[key] / total) * 100 : 0;
    return {
      name: key,
      label: SCORE_LABELS[key],
      value: roundTenths ? Math.round(raw * 10) / 10 : raw,
      color: scoreColors[key],
    };
  });
}

function pickBestRound(rounds: RoundSummary[]): RoundSummary | null {
  const valid = rounds.filter((r) => r.total_score != null);
  if (!valid.length) return null;
  return valid.reduce((best, curr) =>
    curr.total_score! < best.total_score! ? curr : best,
  );
}

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
  name: ScoreKey;
  label: string;
  value: number;
  color: string;
}

export interface MixLegendItem {
  label: string;
  pctLabel: string;
  color: string;
}

export interface ScoreChip {
  label: string;
  count: number;
  color: string;
}

export interface TrendTabItem {
  key: TrendView;
  label: string;
  active: boolean;
}

export interface WhsRoundRow {
  roundIndex: number;
  courseLabel: string;
  ratingLabel: string | null;
  scoreLabel: string;
  differentialLabel: string;
  used: boolean;
  hasDifferential: boolean;
}

export interface BestRoundCard {
  id: string;
  courseName: string;
  dateLabel: string;
  toParLabel: string;
  totalScore: number | null;
}

export interface RecentHole {
  hole_number: number;
  strokes: number | null;
  par_played: number | null;
  colorKey: ScoreKey;
  fill: string;
}

export interface RecentRoundRow {
  id: string;
  scoreLabel: string;
  toPar: number | null;
  toParLabel: string | null;
  toParColor: string;
  accentColor: string;
  courseLabel: string;
  dateLabel: string;
  teeBox: string | null;
  holes: RecentHole[];
}

export interface DashboardPageViewModel {
  data: DashboardData | null;
  trends: AnalyticsData | null;
  user: User | null;
  goalReport: GoalReport | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  dualData: DualTrendPoint[];
  recentMilestones: Milestone[];
  last20ScoringAvg: number | null;
  last20ScoringAvgLabel: string;
  l5ScoringAvg: number | null;
  handicapDelta: number | null;
  l20ScoreMix: ScoreDistItem[];
  mixLegend: MixLegendItem[];
  mixHoleCountLabel: string | null;
  hiTrend: "up" | "down" | "flat" | null;
  girPct: number;
  girPctLabel: string;
  girDonutData: { value: number }[];
  recentDistribution: ScoreDistItem[];
  scramblingPct: number | null;
  scramblingPctLabel: string;
  upAndDownPct: number | null;
  upAndDownPctLabel: string;
  putts: number;
  puttsLabel: string;
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
  firstName: string;
  greetingDateLabel: string;
  handicapIndexLabel: string;
  hiDeltaText: string | null;
  hiDeltaColor: string;
  hiDeltaImproving: boolean;
  scoreDeltaText: string | null;
  scoreDeltaColor: string;
  scoreDeltaImproving: boolean;
  heroKpis: { label: string; value: string }[];
  handicapSheetOpen: boolean;
  openHandicapSheet: () => void;
  closeHandicapSheet: () => void;
  trendView: TrendView;
  setTrendView: (view: TrendView) => void;
  trendTabs: TrendTabItem[];
  bestRound: BestRoundCard | null;
  bestRoundDetail: Round | null;
  lastRound: RecentRoundRow | null;
  lastRoundHoles: RecentHole[];
  lastRoundChips: ScoreChip[];
  recentRoundRows: RecentRoundRow[];
  sidebarRounds: RoundSummary[];
  whsRows: WhsRoundRow[];
  whsWindowSize: number;
  whsCountUsed: number;
  whsAdjustment: number;
  whsAdjustmentLabel: string | null;
  whsDiffAvgLabel: string | null;
  whsHasRatedRounds: boolean;
  whsShowCalculation: boolean;
  whsUsedLegend: string | null;
  whsContextNote: string;
  hasScoringGoal: boolean;
  goalTargetLabel: string | null;
  goalNumberLabel: string | null;
  goalAverageLabel: string | null;
  goalBarPct: number;
  goalProgressPct: number | null;
  goalFocusHeadline: string | null;
  goalOnTrack: boolean;
}

export function useDashboardPageViewModel(
  userId: string,
  repository: DashboardRepository = dashboardRepository,
): DashboardPageViewModel {
  const [handicapSheetOpen, setHandicapSheetOpen] = useState(false);
  const [trendView, setTrendView] = useState<TrendView>("score");

  const { data: fetched, isLoading: loading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard(userId),
    queryFn: async () => {
      const [dashboardResult, analyticsResult] = await Promise.allSettled([
        repository.getDashboard(userId),
        repository.getAnalytics(userId),
      ]);
      if (dashboardResult.status !== "fulfilled") throw dashboardResult.reason;
      return [
        dashboardResult.value,
        analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
      ] as const;
    },
  });

  const { data: user } = useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => repository.getUser(userId),
  });

  const { data: goalReport } = useQuery({
    queryKey: queryKeys.goalReport(userId),
    queryFn: () => repository.getGoalReport(userId, 20),
    enabled: !!user?.scoring_goal,
    retry: false,
  });

  const data = fetched?.[0] ?? null;
  const trends = fetched?.[1] ?? null;

  const bestSummary = useMemo(
    () => pickBestRound(data?.recent_rounds ?? []),
    [data?.recent_rounds],
  );
  const recentSummaries = useMemo(
    () => (data?.recent_rounds ?? []).slice(0, 3),
    [data?.recent_rounds],
  );
  const roundIds = useMemo(() => {
    const ids = [
      bestSummary?.id,
      ...recentSummaries.map((r) => r.id),
    ].filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [bestSummary?.id, recentSummaries]);

  const { data: fetchedRounds } = useQuery({
    queryKey: ["dashboard-round-details", roundIds],
    queryFn: () => Promise.all(roundIds.map((id) => repository.getRound(id))),
    enabled: roundIds.length > 0,
  });

  const roundsById = useMemo(() => {
    const map = new Map<string, Round>();
    for (const round of fetchedRounds ?? []) {
      if (round.id) map.set(round.id, round);
    }
    return map;
  }, [fetchedRounds]);

  const openHandicapSheet = useCallback(() => setHandicapSheetOpen(true), []);
  const closeHandicapSheet = useCallback(() => setHandicapSheetOpen(false), []);

  const colorBlindMode = useMemo(() => getStoredColorBlindMode(), []);
  const colorBlindPalette = useMemo(() => getColorBlindPalette(colorBlindMode), [colorBlindMode]);
  const scoreColors = scoreColorsFromPalette(colorBlindPalette?.score);
  const scoreLineColor = colorBlindPalette?.trend.primary ?? colors.primary;
  const handicapLineColor = colorBlindPalette?.trend.secondary ?? colors.score.double.text;
  const girColor = colorBlindPalette?.ui.success ?? colors.score.birdie.base;
  const warningColor = colorBlindPalette?.ui.warning ?? colors.score.eagle.base;
  const dangerColor = colorBlindPalette?.ui.danger ?? colors.destructive;
  const gridColor = colorBlindPalette?.ui.grid ?? colors.border;
  const mutedFill = colorBlindPalette?.ui.mutedFill ?? colors.muted;

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
    return mixFromRows(last5, scoreColors, true).filter((d) => d.value > 0);
  }, [trends, scoreColors]);

  const last20ScoringAvg = useMemo(() => {
    const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + r.total_score!, 0) / valid.length;
  }, [trends]);

  const l5ScoringAvg = useMemo(() => {
    const valid = (trends?.score_trend ?? []).filter((r) => r.total_score != null);
    if (valid.length < 2) return null;
    const slice = valid.slice(-5);
    return slice.reduce((s, r) => s + r.total_score!, 0) / slice.length;
  }, [trends]);

  const handicapDelta = useMemo(() => {
    const valid = (trends?.handicap_trend ?? []).filter((r) => r.handicap_index != null);
    if (valid.length < 2) return null;
    const recent = valid[valid.length - 1].handicap_index!;
    const prev = valid[Math.max(0, valid.length - 6)].handicap_index!;
    return +(recent - prev).toFixed(1);
  }, [trends]);

  const l20ScoreMix = useMemo<ScoreDistItem[]>(() => {
    const rows = trends?.score_type_distribution ?? [];
    if (!rows.length) return [];
    return mixFromRows(rows, scoreColors, false);
  }, [trends, scoreColors]);


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
      ? (colorBlindPalette?.ui.success ?? colors.score.birdie.base)
      : putts <= 35
        ? warningColor
        : dangerColor;

  const firstName = user?.name?.split(" ")[0] ?? "Golfer";
  const greetingDateLabel = useMemo(() => {
    const now = new Date();
    const day = now.toLocaleDateString("en-US", { weekday: "short" });
    const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${day} · ${date}`;
  }, []);

  const handicapIndexLabel = formatHandicapIndex(data?.handicap_index);
  const hiDeltaText =
    handicapDelta != null && Math.abs(handicapDelta) >= 0.1
      ? `${handicapDelta < 0 ? "↓" : "↑"} ${Math.abs(handicapDelta).toFixed(1)}`
      : null;
  const hiDeltaImproving = handicapDelta != null && handicapDelta < 0;
  const hiDeltaColor = hiDeltaImproving
    ? scoreColors.birdie
    : scoreColors.bogey;

  const scoreDelta =
    last20ScoringAvg != null && l5ScoringAvg != null
      ? last20ScoringAvg - l5ScoringAvg
      : null;
  const scoreDeltaText =
    scoreDelta != null && Math.abs(scoreDelta) >= 0.1
      ? `${scoreDelta > 0 ? "↓" : "↑"} ${Math.abs(scoreDelta).toFixed(1)} vs L5`
      : null;
  const scoreDeltaImproving = scoreDelta != null && scoreDelta > 0;
  const scoreDeltaColor = scoreDeltaImproving
    ? scoreColors.birdie
    : scoreColors.bogey;
  const last20ScoringAvgLabel =
    last20ScoringAvg != null ? last20ScoringAvg.toFixed(1) : "—";
  const puttsLabel = putts > 0 ? putts.toFixed(1) : "—";
  const girPctLabel = girPct > 0 ? `${girPct.toFixed(0)}%` : "—";
  const scramblingPctLabel = scramblingPct != null ? `${scramblingPct.toFixed(0)}%` : "—";
  const upAndDownPctLabel = upAndDownPct != null ? `${upAndDownPct.toFixed(0)}%` : "—";

  const mixLegend = useMemo<MixLegendItem[]>(() => {
    const birdiesPlus =
      (l20ScoreMix.find((d) => d.name === "eagle")?.value ?? 0) +
      (l20ScoreMix.find((d) => d.name === "birdie")?.value ?? 0);
    const items = [
      { label: "Birdie+", value: birdiesPlus, color: scoreColors.birdie },
      { label: "Par", value: l20ScoreMix.find((d) => d.name === "par")?.value ?? 0, color: scoreColors.par },
      { label: "Bogey", value: l20ScoreMix.find((d) => d.name === "bogey")?.value ?? 0, color: scoreColors.bogey },
      { label: "Dbl", value: l20ScoreMix.find((d) => d.name === "double")?.value ?? 0, color: scoreColors.double },
      { label: "Tpl+", value:
        (l20ScoreMix.find((d) => d.name === "triple")?.value ?? 0) +
        (l20ScoreMix.find((d) => d.name === "quad")?.value ?? 0), color: scoreColors.triple },
    ];
    return items.map((item) => ({
      label: item.label,
      pctLabel: `${item.value.toFixed(0)}%`,
      color: item.color,
    }));
  }, [l20ScoreMix, scoreColors]);

  const mixHoleCount = useMemo(
    () => (trends?.score_type_distribution ?? []).reduce((s, r) => s + r.holes_counted, 0),
    [trends],
  );
  const mixHoleCountLabel = mixHoleCount > 0 ? `${mixHoleCount} holes` : null;

  const heroKpis = [
    { label: "BEST", value: data?.best_round?.toString() ?? "—" },
    { label: "ROUNDS", value: data?.total_rounds?.toString() ?? "—" },
    { label: "PUTTS", value: puttsLabel },
    { label: "GIR", value: girPctLabel },
  ];

  const trendTabs: TrendTabItem[] = [
    { key: "score", label: "Score", active: trendView === "score" },
    { key: "hcp", label: "HCP", active: trendView === "hcp" },
  ];

  const holesFromRound = useCallback((round: Round | undefined): RecentHole[] => {
    if (!round) return [];
    return round.hole_scores
      .slice()
      .sort((a, b) => (a.hole_number ?? 0) - (b.hole_number ?? 0))
      .map((h) => {
        const par = h.hole_number != null ? holePar(round, h.hole_number) : null;
        const colorKey = scoreKeyFor(h.strokes, par);
        return {
          hole_number: h.hole_number ?? 0,
          strokes: h.strokes ?? null,
          par_played: par,
          colorKey,
          fill: scoreColors[colorKey],
        };
      });
  }, [scoreColors]);

  const toRoundRow = useCallback((summary: RoundSummary): RecentRoundRow => {
    const toPar = summary.to_par;
    const tone = toParTone(toPar);
    return {
      id: summary.id,
      scoreLabel: summary.total_score != null ? String(summary.total_score) : "—",
      toPar,
      toParLabel: toPar == null ? null : toParDisplay(toPar),
      toParColor: tone.text,
      accentColor: toParFill(toPar),
      courseLabel: summary.course_name ? formatCourseName(summary.course_name) : "Unknown course",
      dateLabel: formatRoundDateShort(summary.date) ?? "—",
      teeBox: summary.tee_box,
      holes: holesFromRound(roundsById.get(summary.id)),
    };
  }, [holesFromRound, roundsById]);

  const lastRound = recentSummaries[0] ? toRoundRow(recentSummaries[0]) : null;
  const lastRoundHoles = useMemo(() => lastRound?.holes ?? [], [lastRound]);
  const recentRoundRows = recentSummaries.map(toRoundRow);
  const sidebarRounds = (data?.recent_rounds ?? []).slice(0, 10);

  const lastRoundChips = useMemo<ScoreChip[]>(() => {
    if (!lastRoundHoles.length) return [];
    const counts: Partial<Record<ScoreKey, number>> = {};
    for (const h of lastRoundHoles) {
      counts[h.colorKey] = (counts[h.colorKey] ?? 0) + 1;
    }
    const items: ScoreChip[] = [];
    const birdiesPlus = (counts.eagle ?? 0) + (counts.birdie ?? 0);
    if (birdiesPlus > 0) {
      items.push({ label: "Birdie+", count: birdiesPlus, color: scoreColors.birdie });
    }
    if (counts.par) items.push({ label: "Par", count: counts.par, color: scoreColors.par });
    if (counts.bogey) items.push({ label: "Bogey", count: counts.bogey, color: scoreColors.bogey });
    if (counts.double) {
      items.push({
        label: "Double",
        count: counts.double,
        color: scoreColors.double,
      });
    }
    return items;
  }, [lastRoundHoles, scoreColors]);

  const bestRound = useMemo<BestRoundCard | null>(() => {
    if (!bestSummary) return null;
    const toPar = bestSummary.to_par;
    return {
      id: bestSummary.id,
      courseName: bestSummary.course_name ?? "Unknown Course",
      dateLabel: formatRoundDateShort(bestSummary.date) ?? "",
      toParLabel: toPar == null ? "" : `To Par: ${toParDisplay(toPar)}`,
      totalScore: bestSummary.total_score,
    };
  }, [bestSummary]);
  const bestRoundDetail = bestSummary ? roundsById.get(bestSummary.id) ?? null : null;

  const whs = useMemo(() => {
    const rowsSource = dualData.slice().reverse();
    const rows: WhsRoundRow[] = rowsSource.map((d) => {
      const diff = trends?.score_differentials.find((s) => s.round_index === d.round_index);
      const trend = trends?.score_trend.find((s) => s.round_index === d.round_index);
      const courseName = trend?.course_name ?? null;
      const score = diff?.score ?? d.total_score ?? null;
      const differential = d.differential ?? null;
      return {
        roundIndex: d.round_index,
        courseLabel: courseName ? formatCourseName(courseName) : `Round ${d.round_index}`,
        ratingLabel:
          diff?.course_rating != null && diff?.slope_rating != null
            ? `${diff.course_rating} / ${diff.slope_rating}`
            : null,
        scoreLabel: score != null ? String(score) : "—",
        differentialLabel:
          differential == null
            ? "—"
            : differential >= 0
              ? `+${differential.toFixed(1)}`
              : differential.toFixed(1),
        used: d.used_in_hi === true,
        hasDifferential: differential != null,
      };
    });
    const validCount = rows.filter((r) => r.hasDifferential).length;
    const n = Math.min(validCount, 20);
    const { countUsed, adjustment } = whsWindow(n);
    const usedDiffs = rowsSource
      .filter((r) => r.used_in_hi === true && r.differential != null)
      .map((r) => r.differential!);
    const diffAvg = usedDiffs.length
      ? usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length
      : null;
    const hasRatedRounds = (trends?.score_differentials ?? []).some((r) => r.course_rating != null);
    return {
      rows,
      windowSize: n,
      countUsed,
      adjustment,
      adjustmentLabel:
        adjustment === 0 ? null : adjustment > 0 ? `+${adjustment}` : String(adjustment),
      diffAvgLabel: diffAvg != null ? diffAvg.toFixed(2) : null,
      hasRatedRounds,
      showCalculation: data?.handicap_index != null && n >= 3,
      usedLegend:
        usedDiffs.length > 0
          ? `Green rows are the ${countUsed} best differential${countUsed !== 1 ? "s" : ""} used in your index`
          : null,
      contextNote: `The World Handicap System uses your best ${countUsed || "N"} differentials from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.`,
    };
  }, [dualData, trends, data?.handicap_index]);

  const hasScoringGoal = user?.scoring_goal != null;
  const goalTargetLabel = hasScoringGoal ? `Break ${user!.scoring_goal! + 1}` : null;
  const goalNumberLabel = hasScoringGoal ? String(user!.scoring_goal! + 1) : null;
  const goalAverageLabel =
    goalReport?.scoring_average != null ? `Avg ${goalReport.scoring_average.toFixed(1)}` : null;
  const goalOnTrack = goalReport?.on_track ?? false;
  const goalFocusHeadline = goalReport?.savers[0]?.headline ?? null;
  const goalBarPct = useMemo(() => {
    if (!goalReport) return 0;
    if (goalReport.on_track) return 100;
    if (goalReport.gap == null) return 5;
    return Math.min(
      100,
      Math.max(5, (1 - goalReport.gap / Math.max(goalReport.scoring_average ?? 1, 1)) * 100),
    );
  }, [goalReport]);
  const goalProgressPct = useMemo(() => {
    if (!user?.scoring_goal) return null;
    const current = goalReport?.scoring_average ?? last20ScoringAvg;
    if (current == null) return null;
    if (goalReport?.on_track) return 100;
    const validScores = dualData.filter((d) => d.total_score != null);
    if (!validScores.length) return null;
    const startAvg = validScores[0].total_score!;
    const range = startAvg - user.scoring_goal;
    if (range <= 0) return 100;
    return Math.min(100, Math.max(0, ((startAvg - current) / range) * 100));
  }, [user, goalReport, last20ScoringAvg, dualData]);

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
    last20ScoringAvgLabel,
    l5ScoringAvg,
    handicapDelta,
    l20ScoreMix,
    mixLegend,
    mixHoleCountLabel,
    hiTrend,
    girPct,
    girPctLabel,
    girDonutData,
    recentDistribution,
    scramblingPct,
    scramblingPctLabel,
    upAndDownPct,
    upAndDownPctLabel,
    putts,
    puttsLabel,
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
    firstName,
    greetingDateLabel,
    handicapIndexLabel,
    hiDeltaText,
    hiDeltaColor,
    hiDeltaImproving,
    scoreDeltaText,
    scoreDeltaColor,
    scoreDeltaImproving,
    heroKpis,
    handicapSheetOpen,
    openHandicapSheet,
    closeHandicapSheet,
    trendView,
    setTrendView,
    trendTabs,
    bestRound,
    bestRoundDetail,
    lastRound,
    lastRoundHoles,
    lastRoundChips,
    recentRoundRows,
    sidebarRounds,
    whsRows: whs.rows,
    whsWindowSize: whs.windowSize,
    whsCountUsed: whs.countUsed,
    whsAdjustment: whs.adjustment,
    whsAdjustmentLabel: whs.adjustmentLabel,
    whsDiffAvgLabel: whs.diffAvgLabel,
    whsHasRatedRounds: whs.hasRatedRounds,
    whsShowCalculation: whs.showCalculation,
    whsUsedLegend: whs.usedLegend,
    whsContextNote: whs.contextNote,
    hasScoringGoal,
    goalTargetLabel,
    goalNumberLabel,
    goalAverageLabel,
    goalBarPct,
    goalProgressPct,
    goalFocusHeadline,
    goalOnTrack,
  };
}
