import { colors, toParFill, toParLabel, toParTone, type ScoreKey } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateShort } from "@/lib/roundDate";
import {
  holeKind,
  roundScore,
  roundToPar,
  type HoleScore,
  type MilestoneFact,
  type Round,
  type ScoreMixItem,
  type WhsRound,
} from "@/domain";
import type { Milestone, User } from "@/types/golf";
import type { TrendView } from "./useDashboardPageViewModel";

const SCORE_LABELS: Record<ScoreKey, string> = {
  eagle: "Eagle+",
  birdie: "Birdie",
  par: "Par",
  bogey: "Bogey",
  double: "Double",
  triple: "Triple",
  quad: "Quad+",
};

const SCORE_COLORS: Record<ScoreKey, string> = {
  eagle: colors.score.eagle.base,
  birdie: colors.score.birdie.base,
  par: colors.score.par.base,
  bogey: colors.score.bogey.base,
  double: colors.score.double.base,
  triple: colors.score.triple.base,
  quad: colors.score.quad.base,
};

export const dashboardPalette = {
  scoreLineColor: colors.primary,
  handicapLineColor: colors.score.double.text,
  gridColor: colors.border,
};

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

export function puttsLabel(putts: number | null): string {
  return putts != null && putts > 0 ? putts.toFixed(1) : "—";
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

export function deltaColor(improving: boolean): string {
  return improving ? SCORE_COLORS.birdie : SCORE_COLORS.bogey;
}

export function scoreDelta(last20: number | null, last5: number | null): number | null {
  return last20 != null && last5 != null ? last20 - last5 : null;
}

export interface ColoredMixItem {
  name: ScoreKey;
  label: string;
  value: number;
  color: string;
}

export function colorizeMix(mix: ScoreMixItem[]): ColoredMixItem[] {
  return mix.map((item) => ({
    ...item,
    label: SCORE_LABELS[item.name],
    color: SCORE_COLORS[item.name],
  }));
}

export interface MixLegendItem {
  label: string;
  pctLabel: string;
  color: string;
}

export function mixLegend(mix: ScoreMixItem[]): MixLegendItem[] {
  const valueOf = (name: ScoreKey) => mix.find((d) => d.name === name)?.value ?? 0;
  const items = [
    { label: "Birdie+", value: valueOf("eagle") + valueOf("birdie"), color: SCORE_COLORS.birdie },
    { label: "Par", value: valueOf("par"), color: SCORE_COLORS.par },
    { label: "Bogey", value: valueOf("bogey"), color: SCORE_COLORS.bogey },
    { label: "Dbl", value: valueOf("double"), color: SCORE_COLORS.double },
    { label: "Tpl+", value: valueOf("triple") + valueOf("quad"), color: SCORE_COLORS.triple },
  ];
  return items.map((item) => ({
    label: item.label,
    pctLabel: `${item.value.toFixed(0)}%`,
    color: item.color,
  }));
}

export function heroKpis(opts: {
  bestRound: number | null | undefined;
  totalRounds: number | null | undefined;
  putts: number | null;
  girPct: number | null;
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

/** A hole ready to draw: unscored holes read as par. */
export interface PaintedHole extends HoleScore {
  kind: ScoreKey;
  fill: string;
}

function paint(hole: HoleScore): PaintedHole {
  const kind = holeKind(hole) ?? "par";
  return { ...hole, kind, fill: SCORE_COLORS[kind] };
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

export function toRoundRow(round: Round): RecentRoundRow {
  const score = roundScore(round);
  const toPar = roundToPar(round);
  return {
    id: round.id,
    scoreLabel: score != null ? String(score) : "—",
    toPar,
    toParLabel: toParLabel(toPar),
    toParColor: toParTone(toPar).text,
    accentColor: toParFill(toPar),
    courseLabel: round.course?.name ? formatCourseName(round.course.name) : "Unknown course",
    dateLabel: formatRoundDateShort(round.date) ?? "—",
    teeBox: round.teeBox,
    holes: round.holes.map(paint),
  };
}

export interface ScoreChip {
  label: string;
  count: number;
  color: string;
}

export function lastRoundChips(holes: HoleScore[]): ScoreChip[] {
  if (!holes.length) return [];
  const counts: Partial<Record<ScoreKey, number>> = {};
  for (const h of holes) {
    const kind = holeKind(h);
    if (kind) counts[kind] = (counts[kind] ?? 0) + 1;
  }
  const items: ScoreChip[] = [];
  const birdiesPlus = (counts.eagle ?? 0) + (counts.birdie ?? 0);
  if (birdiesPlus > 0) items.push({ label: "Birdie+", count: birdiesPlus, color: SCORE_COLORS.birdie });
  if (counts.par) items.push({ label: "Par", count: counts.par, color: SCORE_COLORS.par });
  if (counts.bogey) items.push({ label: "Bogey", count: counts.bogey, color: SCORE_COLORS.bogey });
  if (counts.double) items.push({ label: "Double", count: counts.double, color: SCORE_COLORS.double });
  return items;
}

/** A stored goal of 79 reads "Break 80". */
export function goalTargetLabel(target: number): string {
  return `Break ${target + 1}`;
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

const MILESTONE_TYPES: Record<MilestoneFact["kind"], Milestone["type"]> = {
  under_par: "under_par",
  score_break: "score_break",
  putt_break: "putt_break",
  par_streak: "par_streak",
};

function milestoneLabel({ kind, value }: MilestoneFact): string {
  switch (kind) {
    case "under_par":
      return `First round under par (${value})`;
    case "score_break":
      return `Best score: ${value} or better`;
    case "putt_break":
      return `Fewest putts: ${value}`;
    case "par_streak":
      return `Par streak: ${value} in a row`;
  }
}

/** Feed rows for the milestone card: label, and the date as "YYYY/MM/DD". */
export function presentMilestones(facts: MilestoneFact[]): Milestone[] {
  return facts.map((fact) => ({
    type: MILESTONE_TYPES[fact.kind],
    label: milestoneLabel(fact),
    date: fact.date.replace(/-/g, "/"),
    course: fact.course,
    round_id: fact.roundId,
  }));
}
