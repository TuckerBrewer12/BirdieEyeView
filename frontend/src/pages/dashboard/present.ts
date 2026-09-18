import { getStoredColorBlindMode } from "@/lib/accessibility";
import { getColorBlindPalette } from "@/lib/chartPalettes";
import { SCORE_COLORS, SCORE_LABELS } from "@/lib/colors";
import { colors } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateShort } from "@/lib/roundDate";
import { formatHandicapIndex } from "@/domain/handicap";
import { toParLabel } from "@/brand/theme";
import type { Round, RoundSummary, User } from "@/types/golf";
import type { GoalReport } from "@/types/analytics";
import {
  holesFromRound,
  type DualTrendPoint,
  type HiTrend,
  type HoleColorKey,
  type RecentHole,
  type ScoreMixItem,
  type TrendView,
  type WhsRound,
} from "./model";

export type { RecentHole, TrendView };

export interface DashboardPalette {
  scoreColors: Record<string, string>;
  scoreLineColor: string;
  handicapLineColor: string;
  girColor: string;
  warningColor: string;
  dangerColor: string;
  gridColor: string;
  mutedFill: string;
}

export function dashboardPalette(): DashboardPalette {
  const colorBlindPalette = getColorBlindPalette(getStoredColorBlindMode());
  return {
    scoreColors: (colorBlindPalette?.score ?? SCORE_COLORS) as Record<string, string>,
    scoreLineColor: colorBlindPalette?.trend.primary ?? colors.primary,
    handicapLineColor: colorBlindPalette?.trend.secondary ?? colors.score.double.text,
    girColor: colorBlindPalette?.ui.success ?? colors.score.birdie.base,
    warningColor: colorBlindPalette?.ui.warning ?? colors.score.eagle.base,
    dangerColor: colorBlindPalette?.ui.danger ?? colors.destructive,
    gridColor: colorBlindPalette?.ui.grid ?? colors.border,
    mutedFill: colorBlindPalette?.ui.mutedFill ?? colors.muted,
  };
}

export function firstNameOf(user: User | null): string {
  return user?.name?.split(" ")[0] ?? "Golfer";
}

export function greetingDateLabel(now = new Date()): string {
  const day = now.toLocaleDateString("en-US", { weekday: "short" });
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${date}`;
}

export function avgLabel(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}

export function pctLabel(value: number | null | undefined, empty = "—"): string {
  return value != null ? `${value.toFixed(0)}%` : empty;
}

export function puttsLabel(putts: number): string {
  return putts > 0 ? putts.toFixed(1) : "—";
}

export function deltaText(
  delta: number | null,
  opts: { vsL5?: boolean } = {},
): string | null {
  if (delta == null || Math.abs(delta) < 0.1) return null;
  const improving = opts.vsL5 ? delta > 0 : delta < 0;
  const arrow = improving ? "↓" : "↑";
  const suffix = opts.vsL5 ? " vs L5" : "";
  return `${arrow} ${Math.abs(delta).toFixed(1)}${suffix}`;
}

export function deltaColor(improving: boolean, scoreColors: Record<string, string>): string {
  return improving
    ? (scoreColors.birdie ?? colors.score.birdie.base)
    : (scoreColors.bogey ?? colors.score.bogey.base);
}

export function scoreDelta(last20: number | null, last5: number | null): number | null {
  return last20 != null && last5 != null ? last20 - last5 : null;
}

export interface ColoredMixItem {
  name: string;
  label: string;
  value: number;
  color: string;
}

export function colorizeMix(
  mix: ScoreMixItem[],
  scoreColors: Record<string, string>,
): ColoredMixItem[] {
  return mix.map((item) => ({
    ...item,
    label: (SCORE_LABELS[item.name] as string) ?? item.name,
    color: scoreColors[item.name],
  }));
}

export interface MixLegendItem {
  label: string;
  pctLabel: string;
  color: string;
}

export function mixLegend(
  mix: ScoreMixItem[],
  scoreColors: Record<string, string>,
): MixLegendItem[] {
  const valueOf = (name: string) => mix.find((d) => d.name === name)?.value ?? 0;
  const items = [
    { label: "Birdie+", value: valueOf("eagle") + valueOf("birdie"), color: scoreColors.birdie },
    { label: "Par", value: valueOf("par"), color: scoreColors.par },
    { label: "Bogey", value: valueOf("bogey"), color: scoreColors.bogey },
    { label: "Dbl", value: valueOf("double_bogey"), color: scoreColors.double_bogey },
    {
      label: "Tpl+",
      value: valueOf("triple_bogey") + valueOf("quad_bogey"),
      color: scoreColors.triple_bogey,
    },
  ];
  return items.map((item) => ({
    label: item.label,
    pctLabel: `${item.value.toFixed(0)}%`,
    color: item.color,
  }));
}

export function mixHoleCountLabel(count: number): string | null {
  return count > 0 ? `${count} holes` : null;
}

export function girDonutData(pct: number): { value: number }[] {
  return [{ value: pct }, { value: 100 - pct }];
}

export function puttsClamped(putts: number): number {
  return Math.max(20, Math.min(40, putts));
}

export function puttsGaugeData(putts: number): { value: number }[] {
  const clamped = puttsClamped(putts);
  return [{ value: clamped - 20 }, { value: 20 }];
}

export function puttsColor(putts: number, palette: DashboardPalette): string {
  if (putts < 30) return palette.girColor;
  if (putts <= 35) return palette.warningColor;
  return palette.dangerColor;
}

export function heroKpis(opts: {
  bestRound: number | null | undefined;
  totalRounds: number | null | undefined;
  putts: number;
  girPct: number;
}): { label: string; value: string }[] {
  return [
    { label: "BEST", value: opts.bestRound?.toString() ?? "—" },
    { label: "ROUNDS", value: opts.totalRounds?.toString() ?? "—" },
    { label: "PUTTS", value: puttsLabel(opts.putts) },
    { label: "GIR", value: pctLabel(opts.girPct) },
  ];
}

export interface TrendTabItem {
  key: TrendView;
  label: string;
  active: boolean;
}

export function trendTabs(trendView: TrendView): TrendTabItem[] {
  return [
    { key: "score", label: "Score", active: trendView === "score" },
    { key: "hcp", label: "HCP", active: trendView === "hcp" },
  ];
}

function holeFill(key: HoleColorKey, scoreColors: Record<string, string>): string {
  return scoreColors[key] ?? colors.score.par.base;
}

function toParAccent(toPar: number | null, scoreColors: Record<string, string>): string {
  if (toPar == null) return scoreColors.par ?? colors.score.par.base;
  if (toPar <= 0) return scoreColors.birdie ?? colors.score.birdie.base;
  if (toPar <= 14) return scoreColors.bogey ?? colors.score.bogey.base;
  return scoreColors.double_bogey ?? colors.score.double.base;
}

function toParTextColor(toPar: number | null, scoreColors: Record<string, string>): string {
  if (toPar == null) return scoreColors.par ?? colors.score.par.text;
  return toPar > 0
    ? (scoreColors.bogey ?? colors.score.bogey.text)
    : (scoreColors.birdie ?? colors.score.birdie.text);
}

export interface PaintedHole extends RecentHole {
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
  holes: PaintedHole[];
}

export function toRoundRow(
  summary: RoundSummary,
  detail: Round | undefined,
  scoreColors: Record<string, string>,
): RecentRoundRow {
  const toPar = summary.to_par;
  return {
    id: summary.id,
    scoreLabel: summary.total_score != null ? String(summary.total_score) : "—",
    toPar,
    toParLabel: toParLabel(toPar),
    toParColor: toParTextColor(toPar, scoreColors),
    accentColor: toParAccent(toPar, scoreColors),
    courseLabel: summary.course_name ? formatCourseName(summary.course_name) : "Unknown course",
    dateLabel: formatRoundDateShort(summary.date) ?? "—",
    teeBox: summary.tee_box,
    holes: holesFromRound(detail).map((h) => ({
      ...h,
      fill: holeFill(h.colorKey, scoreColors),
    })),
  };
}

export interface ScoreChip {
  label: string;
  count: number;
  color: string;
}

export function lastRoundChips(
  holes: RecentHole[],
  scoreColors: Record<string, string>,
): ScoreChip[] {
  if (!holes.length) return [];
  const counts: Partial<Record<HoleColorKey, number>> = {};
  for (const h of holes) {
    counts[h.colorKey] = (counts[h.colorKey] ?? 0) + 1;
  }
  const items: ScoreChip[] = [];
  const birdiesPlus = (counts.eagle ?? 0) + (counts.birdie ?? 0);
  if (birdiesPlus > 0) {
    items.push({
      label: "Birdie+",
      count: birdiesPlus,
      color: scoreColors.birdie ?? colors.score.birdie.base,
    });
  }
  if (counts.par) {
    items.push({ label: "Par", count: counts.par, color: scoreColors.par ?? colors.score.par.base });
  }
  if (counts.bogey) {
    items.push({
      label: "Bogey",
      count: counts.bogey,
      color: scoreColors.bogey ?? colors.score.bogey.base,
    });
  }
  if (counts.double_bogey) {
    items.push({
      label: "Double",
      count: counts.double_bogey,
      color: scoreColors.double_bogey ?? colors.score.double.base,
    });
  }
  return items;
}

export function presentBestRound(summary: RoundSummary | null): {
  id: string;
  courseName: string;
  dateLabel: string;
  toParLabel: string;
  totalScore: number | null;
} | null {
  if (!summary) return null;
  const toPar = summary.to_par;
  return {
    id: summary.id,
    courseName: summary.course_name ?? "Unknown Course",
    dateLabel: formatRoundDateShort(summary.date) ?? "",
    toParLabel: toPar == null ? "" : `To Par: ${toPar > 0 ? `+${toPar}` : toPar}`,
    totalScore: summary.total_score,
  };
}

export function goalTargetLabel(scoringGoal: number | null | undefined): string | null {
  return scoringGoal != null ? `Break ${scoringGoal + 1}` : null;
}

export function goalNumberLabel(scoringGoal: number | null | undefined): string | null {
  return scoringGoal != null ? String(scoringGoal + 1) : null;
}

export function goalAverageLabel(goalReport: GoalReport | null): string | null {
  return goalReport?.scoring_average != null
    ? `Avg ${goalReport.scoring_average.toFixed(1)}`
    : null;
}

export function courseLabelForWhs(row: WhsRound): string {
  return row.courseName ? formatCourseName(row.courseName) : `Round ${row.roundIndex}`;
}

export function ratingLabelForWhs(row: WhsRound): string | null {
  return row.courseRating != null && row.slopeRating != null
    ? `${row.courseRating} / ${row.slopeRating}`
    : null;
}

export function differentialLabel(value: number | null): string {
  if (value == null) return "—";
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function adjustmentLabel(adjustment: number): string | null {
  if (adjustment === 0) return null;
  return adjustment > 0 ? `+${adjustment}` : String(adjustment);
}

export function usedLegend(countUsed: number, usedCount: number): string | null {
  if (usedCount <= 0) return null;
  return `Green rows are the ${countUsed} best differential${countUsed !== 1 ? "s" : ""} used in your index`;
}

export function whsContextNote(countUsed: number): string {
  return `The World Handicap System uses your best ${countUsed || "N"} differentials from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.`;
}

export { formatHandicapIndex };
export type { DualTrendPoint, HiTrend, HoleColorKey };
