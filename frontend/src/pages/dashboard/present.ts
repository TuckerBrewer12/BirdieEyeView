import { colors, scoreKindLabel, type ScoreKey } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import type { User } from "@/types/golf";
import {
  type HiTrend,
  type Milestone,
  type ScoreMixItem,
  type WhsRound,
} from "./model";


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

export interface ColoredMixItem {
  name: ScoreKey;
  label: string;
  value: number;
  color: string;
}

export function colorizeMix(mix: ScoreMixItem[]): ColoredMixItem[] {
  return mix.map((item) => ({
    ...item,
    label: scoreKindLabel(item.name),
    color: colors.score[item.name].base,
  }));
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

/** The goal is stored as the highest score that meets it, so 79 means the player is out to break 80. */
export function goalScoreToBreak(target: number): number {
  return target + 1;
}

/** A stored goal of 79 reads "Break 80". */
export function goalTargetLabel(target: number): string {
  return `Break ${goalScoreToBreak(target)}`;
}

export type PuttsBand = "good" | "fair" | "poor";

/** Which colour band a putts-per-round figure sits in: under 30, up to 35, or more. */
export function puttsBand(putts: number | null): PuttsBand | null {
  if (putts == null) return null;
  if (putts < 30) return "good";
  if (putts <= 35) return "fair";
  return "poor";
}
