import { color, scoreKindLabel, type ScoreKey } from "@/brand/theme";
import {
  SCORE_KINDS,
  formatCourseName,
  formatSignedOneDecimal,
  formatWeekdayDay,
  pluralNoun,
  type ScoreMix,
} from "@/domain";
import type { UserDto } from "@/types/api";
import {
  type HiTrend,
  type Milestone,
  type WhsRound,
} from "./model";


export function firstNameOf(user: UserDto | null): string {
  return user?.name?.split(" ")[0] ?? "Golfer";
}

/** Today above the greeting: "Mon · Jun 15". */
export function greetingDateLabel(now = new Date()): string {
  return formatWeekdayDay(now, { year: false }) ?? "";
}

export function puttsLabel(putts: number | null): string {
  return putts != null && putts > 0 ? putts.toFixed(1) : "—";
}

export interface ColoredMixItem {
  name: ScoreKey;
  label: string;
  value: number;
  color: string;
}

/** The mix's bars, in bucket order, to a tenth of a percent: a kind with no holes has no bar. */
export function colorizeMix(mix: ScoreMix): ColoredMixItem[] {
  return SCORE_KINDS.flatMap((kind) => {
    const value = Math.round(mix[kind] * 10) / 10;
    return value > 0
      ? [{ name: kind, label: scoreKindLabel(kind), value, color: color(`score-${kind}-base`) }]
      : [];
  });
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
  return value != null ? formatSignedOneDecimal(value) : "—";
}

export function adjustmentLabel(adjustment: number): string | null {
  if (adjustment === 0) return null;
  return adjustment > 0 ? `+${adjustment}` : String(adjustment);
}

export function usedLegend(countUsed: number, usedCount: number): string | null {
  if (usedCount <= 0) return null;
  return `Green rows are the ${countUsed} best ${pluralNoun(countUsed, "differential")} used in your index`;
}

export function whsContextNote(countUsed: number): string {
  return `The World Handicap System uses your best ${countUsed || "N"} ${pluralNoun(countUsed || 2, "differential")} from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.`;
}

export type { HiTrend };

const MILESTONE_WORDING: Record<Milestone["kind"], { title: string; figure: (value: number) => string }> = {
  under_par: { title: "First round under par", figure: String },
  // A break is a round that came in under the threshold, so 80 reads "<80".
  score_break: { title: "Best score", figure: (threshold) => `<${threshold}` },
  putt_break: { title: "Fewest putts", figure: (threshold) => `<${threshold}` },
  par_streak: { title: "Longest par streak", figure: String },
};

/** What a milestone is, and the number the feed shows beside it. */
export function milestoneWording(milestone: Milestone): { title: string; figure: string } {
  const wording = MILESTONE_WORDING[milestone.kind];
  return { title: wording.title, figure: wording.figure(milestone.value) };
}

