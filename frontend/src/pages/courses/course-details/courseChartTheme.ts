import { chartColors, colors } from "@/brand/theme";
import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import type { ScoreTypeBar } from "./useCourseDetailPageViewModel";

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

export function toParFill(toPar: number | null, theme: CourseChartTheme): string {
  if (toPar == null || toPar === 0) return theme.muted;
  if (toPar <= -2) return theme.varianceTop;
  if (toPar < 0) return theme.success;
  return theme.danger;
}

export function toParBarFill(averageToPar: number, theme: CourseChartTheme): string {
  return averageToPar <= 0 ? theme.success : theme.danger;
}

/** Paint for the course charts. The view model returns numbers; this file turns them into colors. */
export function chartThemeFrom(): CourseChartTheme {
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
