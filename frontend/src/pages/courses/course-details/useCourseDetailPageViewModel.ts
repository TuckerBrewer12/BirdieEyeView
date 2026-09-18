import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateHistory, formatRoundDateTick } from "@/lib/roundDate";
import { teeSwatchClass, teeSwatchTextClass } from "@/lib/teeColor";
import { messageFrom } from "@/lib/userFacingErrors";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { queryKeys } from "@/data/queryKeys";
import {
  ALL_HOLES,
  BACK_HOLES,
  FRONT_HOLES,
  coursePar as courseParOf,
  getHole,
  getTee,
  longestTee,
  teeYards,
  teeYardsForHoles,
} from "@/domain/course";
import { ratedCourseHandicap } from "@/domain/handicap";
import type { Course, Tee } from "@/types/golf";
import type { CourseAnalyticsData, CourseScoreTrendRow } from "@/types/analytics";
import { chartColors, colors, toParLabel } from "@/brand/theme";
import { coursesRepository, type CoursesRepository } from "../coursesRepository";

export type PageTabKey = "course" | "performance";
export type ChartTabKey = "score" | "gir" | "putts" | "variance";

export interface TabItem<K extends string = string> {
  key: K;
  label: string;
}

export interface HeaderStat {
  label: string;
  value: string;
}

export interface TeeChip {
  color: string;
  selected: boolean;
  rating: string | null;
  slope: string | null;
  yards: string | null;
  courseHandicapLabel: string | null;
  swatchClass: string;
  swatchTextClass: string;
}

export interface ScorecardCell {
  hole: number;
  par: string;
  handicap: string;
  yards: string;
  personalAvg: string | null;
}

export interface ScorecardNine {
  label: string;
  showTotal: boolean;
  showYards: boolean;
  showPersonalAvg: boolean;
  teeLabel: string | null;
  teeSwatchClass: string;
  teeSwatchTextClass: string;
  holes: ScorecardCell[];
  ninePar: string;
  nineYards: string;
  ninePersonalAvg: string | null;
  totalPar: string | null;
  totalYards: string | null;
  totalPersonalAvg: string | null;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface RoundHistoryRow {
  id: string | null;
  date: string | null;
  total_score: number | null;
  to_par: number | null;
}

export interface TrendPoint {
  round_index: number;
  total_score: number;
  dateLabel: string;
  tickLabel: string | null;
  fill: string;
  toParLabel: string | null;
}

export interface ToParBar {
  hole_number: number;
  label: string;
  average_to_par: number;
  fill: string;
}

export interface GirBar {
  hole_number: number;
  gir_percentage: number;
}

export interface PuttsBar {
  hole_number: number;
  average_putts: number;
}

export interface VarianceBar {
  hole_number: number;
  label: string;
  score_std_dev: number;
}

export interface ScoreTypeBar {
  hole_number: number;
  sample_size: number;
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double_bogey: number;
  triple_bogey: number;
  quad_bogey: number;
}

export interface ScoreTypeSeries {
  key: keyof Omit<ScoreTypeBar, "hole_number" | "sample_size">;
  name: string;
  fill: string;
}

export interface CourseChartTheme {
  trend: string;
  grid: string;
  axis: string;
  muted: string;
  success: string;
  danger: string;
  girTop: string;
  girBottom: string;
  puttsTop: string;
  puttsBottom: string;
  varianceTop: string;
  varianceBottom: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  scoreTypeSeries: ScoreTypeSeries[];
}

export type CourseChartCard =
  | { kind: "toPar"; title: string; group: ChartTabKey; rows: ToParBar[] }
  | { kind: "scoreType"; title: string; group: ChartTabKey; rows: ScoreTypeBar[]; series: ScoreTypeSeries[] }
  | { kind: "gir"; title: string; group: ChartTabKey; rows: GirBar[] }
  | { kind: "putts"; title: string; group: ChartTabKey; rows: PuttsBar[] }
  | { kind: "difficulty"; title: string; group: ChartTabKey; rows: ToParBar[] }
  | { kind: "variance"; title: string; group: ChartTabKey; rows: VarianceBar[] };

export interface CourseDetailPageViewModel {
  loading: boolean;
  loadError: string | null;
  hasCourse: boolean;
  courseName: string;
  location: string | null;
  headerStats: HeaderStat[];
  pageTabs: TabItem<PageTabKey>[];
  activeTab: PageTabKey;
  selectPageTab: (key: string) => void;
  teeChips: TeeChip[];
  selectTee: (color: string) => void;
  frontNine: ScorecardNine;
  backNine: ScorecardNine;
  showPerformanceTab: boolean;
  heroStats: HeroStat[];
  scoreTrend: TrendPoint[];
  roundHistory: RoundHistoryRow[];
  chartTabs: TabItem<ChartTabKey>[];
  chartTab: ChartTabKey;
  selectChartTab: (key: string) => void;
  charts: CourseChartCard[];
  selectedCharts: CourseChartCard[];
  chartTheme: CourseChartTheme;
}

const PAGE_TABS: TabItem<PageTabKey>[] = [
  { key: "course", label: "Course" },
  { key: "performance", label: "My Performance" },
];

const CHART_TABS: TabItem<ChartTabKey>[] = [
  { key: "score", label: "Score" },
  { key: "gir", label: "GIR" },
  { key: "putts", label: "Putts" },
  { key: "variance", label: "Variance" },
];

const EMPTY_ANALYTICS: CourseAnalyticsData = {
  course_id: "",
  rounds_played: 0,
  score_trend_on_course: [],
  average_score_relative_to_par_by_hole: [],
  gir_percentage_by_hole: [],
  average_putts_by_hole: [],
  score_type_distribution_by_hole: [],
  course_difficulty_profile_by_hole: [],
  average_score_when_gir_vs_missed: [],
  score_variance_by_hole: [],
};

function dash(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function toParFill(toPar: number | null, theme: CourseChartTheme): string {
  if (toPar == null || toPar === 0) return theme.muted;
  if (toPar <= -2) return theme.varianceTop;
  if (toPar < 0) return theme.success;
  return theme.danger;
}

function buildNine(
  course: Course,
  holes: readonly number[],
  label: string,
  showTotal: boolean,
  selectedTee: Tee | null,
  personalParByHole: Record<number, number> | undefined,
): ScorecardNine {
  const parRow = holes.map((n) => getHole(course, n)?.par ?? null);
  const ninePar = parRow.every((par) => par != null) ? parRow.reduce((sum, par) => sum + par!, 0) : null;
  const totalPar = showTotal
    ? ALL_HOLES.every((n) => getHole(course, n)?.par != null)
      ? ALL_HOLES.reduce((sum, n) => sum + (getHole(course, n)?.par ?? 0), 0)
      : null
    : null;
  const nineYards = selectedTee ? teeYardsForHoles(selectedTee, holes) : null;
  const totalYards = selectedTee && showTotal ? teeYardsForHoles(selectedTee, ALL_HOLES) : null;
  const ninePersonalAvg = personalParByHole
    ? holes.reduce((sum, n) => sum + (personalParByHole[n] ?? 0), 0)
    : null;
  const totalPersonalAvg = personalParByHole && showTotal
    ? ALL_HOLES.reduce((sum, n) => sum + (personalParByHole[n] ?? 0), 0)
    : null;

  return {
    label,
    showTotal,
    showYards: selectedTee != null,
    showPersonalAvg: personalParByHole != null,
    teeLabel: selectedTee?.color ?? null,
    teeSwatchClass: teeSwatchClass(selectedTee?.color ?? null),
    teeSwatchTextClass: teeSwatchTextClass(selectedTee?.color ?? null),
    holes: holes.map((n) => ({
      hole: n,
      par: dash(getHole(course, n)?.par),
      handicap: dash(getHole(course, n)?.handicap),
      yards: selectedTee ? dash(selectedTee.hole_yardages[n] || null) : "—",
      personalAvg: personalParByHole?.[n] != null ? personalParByHole[n].toFixed(1) : null,
    })),
    ninePar: dash(ninePar),
    nineYards: nineYards ? String(nineYards) : "—",
    ninePersonalAvg: ninePersonalAvg != null ? ninePersonalAvg.toFixed(1) : null,
    totalPar: showTotal ? dash(totalPar) : null,
    totalYards: showTotal ? (totalYards ? String(totalYards) : "—") : null,
    totalPersonalAvg: showTotal && totalPersonalAvg != null ? totalPersonalAvg.toFixed(1) : null,
  };
}

function chartThemeFrom(): CourseChartTheme {
  const blind = getColorBlindPalette(getStoredColorBlindMode());
  if (blind) {
    return {
      trend: blind.trend.primary,
      grid: blind.ui.grid,
      axis: blind.ui.neutral,
      muted: blind.ui.neutral,
      success: blind.ui.success,
      danger: blind.ui.danger,
      girTop: blind.trend.tertiary,
      girBottom: blind.trend.primary,
      puttsTop: blind.ui.mutedFill,
      puttsBottom: blind.ui.neutral,
      varianceTop: blind.ui.warning,
      varianceBottom: blind.score.bogey,
      card: colors.card,
      foreground: colors.foreground,
      mutedForeground: colors.mutedForeground,
      border: colors.border,
      scoreTypeSeries: [
        { key: "eagle", name: "Eagle+", fill: blind.score.eagle },
        { key: "birdie", name: "Birdie", fill: blind.score.birdie },
        { key: "par", name: "Par", fill: blind.score.par },
        { key: "bogey", name: "Bogey", fill: blind.score.bogey },
        { key: "double_bogey", name: "Double", fill: blind.score.double_bogey },
        { key: "triple_bogey", name: "Triple", fill: blind.score.triple_bogey },
        { key: "quad_bogey", name: "Quad+", fill: blind.score.quad_bogey },
      ],
    };
  }

  return {
    trend: colors.primary,
    grid: chartColors.muted,
    axis: chartColors.axis,
    muted: colors.score.par.base,
    success: colors.score.birdie.base,
    danger: colors.score.bogey.base,
    girTop: chartColors.accent,
    girBottom: colors.primary,
    puttsTop: colors.muted,
    puttsBottom: colors.mutedForeground,
    varianceTop: colors.score.eagle.base,
    varianceBottom: colors.score.bogey.base,
    card: colors.card,
    foreground: colors.foreground,
    mutedForeground: colors.mutedForeground,
    border: colors.border,
    scoreTypeSeries: [
      { key: "eagle", name: "Eagle+", fill: colors.score.eagle.base },
      { key: "birdie", name: "Birdie", fill: colors.score.birdie.base },
      { key: "par", name: "Par", fill: colors.score.par.base },
      { key: "bogey", name: "Bogey", fill: colors.score.bogey.base },
      { key: "double_bogey", name: "Double", fill: colors.score.double.base },
      { key: "triple_bogey", name: "Triple", fill: colors.score.triple.base },
      { key: "quad_bogey", name: "Quad+", fill: colors.score.quad.base },
    ],
  };
}

function emptyNine(label: string, showTotal: boolean): ScorecardNine {
  return {
    label,
    showTotal,
    showYards: false,
    showPersonalAvg: false,
    teeLabel: null,
    teeSwatchClass: "bg-muted",
    teeSwatchTextClass: "text-foreground",
    holes: [],
    ninePar: "—",
    nineYards: "—",
    ninePersonalAvg: null,
    totalPar: showTotal ? "—" : null,
    totalYards: showTotal ? "—" : null,
    totalPersonalAvg: null,
  };
}

function chartsFrom(
  analytics: CourseAnalyticsData,
  theme: CourseChartTheme,
): CourseChartCard[] {
  const toPar = (row: { hole_number: number; average_to_par: number }): ToParBar => ({
    hole_number: row.hole_number,
    label: `H${row.hole_number}`,
    average_to_par: row.average_to_par,
    fill: row.average_to_par <= 0 ? theme.success : theme.danger,
  });

  return [
    {
      kind: "toPar",
      title: "Average Score To Par By Hole",
      group: "score",
      rows: analytics.average_score_relative_to_par_by_hole.map(toPar),
    },
    {
      kind: "scoreType",
      title: "Score Type Distribution By Hole",
      group: "score",
      rows: analytics.score_type_distribution_by_hole,
      series: theme.scoreTypeSeries,
    },
    {
      kind: "gir",
      title: "GIR Percentage By Hole",
      group: "gir",
      rows: analytics.gir_percentage_by_hole,
    },
    {
      kind: "putts",
      title: "Average Putts By Hole",
      group: "putts",
      rows: analytics.average_putts_by_hole,
    },
    {
      kind: "difficulty",
      title: "Course Difficulty Profile (Hardest To Easiest)",
      group: "variance",
      rows: analytics.course_difficulty_profile_by_hole.map(toPar),
    },
    {
      kind: "variance",
      title: "Score Variance By Hole (Std Dev)",
      group: "variance",
      rows: analytics.score_variance_by_hole.map((row) => ({
        hole_number: row.hole_number,
        label: `H${row.hole_number}`,
        score_std_dev: row.score_std_dev ?? 0,
      })),
    },
  ];
}

function trendFrom(rows: CourseScoreTrendRow[], theme: CourseChartTheme): TrendPoint[] {
  return rows
    .filter((row): row is CourseScoreTrendRow & { total_score: number } => row.total_score != null)
    .map((row) => ({
      round_index: row.round_index,
      total_score: row.total_score,
      dateLabel: formatRoundDateHistory(row.date) ?? "—",
      tickLabel: formatRoundDateTick(row.date),
      fill: toParFill(row.to_par, theme),
      toParLabel: toParLabel(row.to_par),
    }));
}

export function useCourseDetailPageViewModel(
  userId: string,
  courseId: string | undefined,
  repository: CoursesRepository = coursesRepository,
): CourseDetailPageViewModel {
  const [teeOverride, setTeeOverride] = useState<string | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<PageTabKey>("course");
  const [chartTab, setChartTab] = useState<ChartTabKey>("score");
  const chartTheme = useMemo(() => chartThemeFrom(), []);

  const {
    data: course,
    isLoading: courseLoading,
    isError: courseFailed,
    error: courseError,
  } = useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => repository.getCourse(courseId!),
    enabled: !!courseId,
  });

  const { data: analytics = EMPTY_ANALYTICS, isLoading: analyticsLoading } = useQuery({
    queryKey: queryKeys.courseAnalytics(userId, courseId),
    queryFn: () => repository.getCourseAnalytics(userId, courseId!),
    enabled: !!courseId,
  });

  const { data: handicapData } = useQuery({
    queryKey: queryKeys.handicap(userId),
    queryFn: async () => {
      try {
        return await repository.getUserHandicap(userId);
      } catch {
        return { handicap_index: null };
      }
    },
  });

  const handicapIndex = handicapData?.handicap_index ?? null;
  const defaultTee = course ? longestTee(course) : null;
  const selectedTeeColor = teeOverride === undefined ? defaultTee?.color ?? null : teeOverride;
  const selectedTee = getTee(course, selectedTeeColor);

  const personalParByHole = useMemo(() => {
    if (analytics.rounds_played === 0) return undefined;
    const result: Record<number, number> = {};
    for (const row of analytics.average_score_relative_to_par_by_hole) {
      result[row.hole_number] = row.average_score;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }, [analytics]);

  const par = courseParOf(course);
  const showPerformanceTab = analytics.rounds_played > 0;
  const scoreTrend = useMemo(
    () => trendFrom(analytics.score_trend_on_course, chartTheme),
    [analytics.score_trend_on_course, chartTheme],
  );
  const scores = scoreTrend.map((row) => row.total_score);
  const scoringAvg = scores.length === 0
    ? null
    : scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const charts = useMemo(() => chartsFrom(analytics, chartTheme), [analytics, chartTheme]);

  const teeChips: TeeChip[] = (course?.tees ?? [])
    .slice()
    .sort((a, b) => (teeYards(b) ?? 0) - (teeYards(a) ?? 0))
    .flatMap((tee) => {
      if (!tee.color) return [];
      const selected = tee.color.toLowerCase() === selectedTeeColor?.toLowerCase();
      const ch = ratedCourseHandicap(handicapIndex, tee, par);
      return [{
        color: tee.color,
        selected,
        rating: tee.course_rating != null ? `Rating ${tee.course_rating}` : null,
        slope: tee.slope_rating != null ? `/ Slope ${tee.slope_rating}` : null,
        yards: tee.total_yardage != null ? `/ ${tee.total_yardage} yds` : null,
        courseHandicapLabel: ch != null ? `CH ${ch}` : null,
        swatchClass: teeSwatchClass(tee.color),
        swatchTextClass: teeSwatchTextClass(tee.color),
      }];
    });

  return {
    loading: !!courseId && (courseLoading || analyticsLoading),
    loadError: courseFailed ? messageFrom(courseError, "Course not found.") : null,
    hasCourse: course != null,
    courseName: formatCourseName(course?.name),
    location: course?.location ?? null,
    headerStats: [
      { label: "Par", value: dash(par) },
      { label: "Holes", value: String(course?.holes.length ?? 0) },
      { label: "Tees", value: String(course?.tees.length ?? 0) },
    ],
    pageTabs: showPerformanceTab ? PAGE_TABS : PAGE_TABS.filter((tab) => tab.key === "course"),
    activeTab: showPerformanceTab ? activeTab : "course",
    selectPageTab: (key) => {
      if (key === "course" || key === "performance") setActiveTab(key);
    },
    teeChips,
    selectTee: (color) => {
      setTeeOverride((current) => {
        const selected = current === undefined ? defaultTee?.color ?? null : current;
        return selected?.toLowerCase() === color.toLowerCase() ? null : color;
      });
    },
    frontNine: course
      ? buildNine(course, FRONT_HOLES, "OUT", false, selectedTee, personalParByHole)
      : emptyNine("OUT", false),
    backNine: course
      ? buildNine(course, BACK_HOLES, "IN", true, selectedTee, personalParByHole)
      : emptyNine("IN", true),
    showPerformanceTab,
    heroStats: [
      { value: String(analytics.rounds_played), label: "Rounds Played" },
      { value: scoringAvg != null ? scoringAvg.toFixed(1) : "—", label: "Scoring Avg" },
      { value: scores.length ? String(Math.min(...scores)) : "—", label: "Best Round" },
      { value: scores.length ? String(Math.max(...scores)) : "—", label: "Worst Round" },
    ],
    scoreTrend,
    roundHistory: [...analytics.score_trend_on_course].reverse().map((row) => ({
      id: row.round_id,
      date: row.date,
      total_score: row.total_score,
      to_par: row.to_par,
    })),
    chartTabs: CHART_TABS,
    chartTab,
    selectChartTab: (key) => {
      if (CHART_TABS.some((tab) => tab.key === key)) setChartTab(key as ChartTabKey);
    },
    charts,
    selectedCharts: charts.filter((chart) => chart.group === chartTab),
    chartTheme,
  };
}
