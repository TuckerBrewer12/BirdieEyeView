import {
  formatCourseName,
  formatDayShort,
  formatOneDecimal,
  formatSignedOneDecimal,
  pluralNoun,
} from "@/domain";
import type { UserDto } from "@/types/api";
import type { Milestone, WhsRound } from "./model";

export function firstNameOf(user: UserDto | null): string {
  return user?.name?.split(" ")[0] ?? "Golfer";
}

/** "Hi, Tucker": the dashboard's greeting. */
export function greetingOf(user: UserDto | null): string {
  return `Hi, ${firstNameOf(user)}`;
}

/** A figure's move as the strip shows it: which way, and how far, unsigned. No move shows nothing. */
export interface Move {
  direction: "up" | "down" | null;
  amount: string;
}

export function moveOf(change: number | null): Move {
  if (change == null || change === 0) return { direction: null, amount: "" };
  return { direction: change < 0 ? "down" : "up", amount: formatOneDecimal(Math.abs(change)) };
}

/** "Best · Blue Rock": the best round's figure, named by where it was played. */
export function bestLabel(course: string | null | undefined): string {
  return course ? `Best · ${formatCourseName(course)}` : "Best";
}

/** The goal card's verdict beside the target. */
export function goalStatusLabel(onTrack: boolean): string {
  return onTrack ? "On track" : "Not yet";
}

/** "Next: fewer three-putts": the saver worth the most strokes, as the next thing to work on. */
export function goalNextLabel(focus: string | null): string | null {
  if (!focus) return null;
  return `Next: ${focus.charAt(0).toLowerCase()}${focus.slice(1)}`;
}

export function courseLabelForWhs(row: WhsRound): string {
  return row.courseName ? formatCourseName(row.courseName) : `Round ${row.roundIndex}`;
}

export function ratingLabelForWhs(row: WhsRound): string | null {
  return row.courseRating != null && row.slopeRating != null
    ? `${row.courseRating} / ${row.slopeRating}`
    : null;
}

/** The phone's row line: "80 · 72.4 / 130". */
export function scoreAndRatingForWhs(row: WhsRound): string {
  return [row.score != null ? String(row.score) : "—", ratingLabelForWhs(row)].filter(Boolean).join(" · ");
}

export function differentialLabel(value: number | null): string {
  return value != null ? formatSignedOneDecimal(value) : "—";
}

/** "5 of 20": how full the WHS window is. */
export function windowFillLabel(windowSize: number): string {
  return `${windowSize} of 20`;
}

export function adjustmentLabel(adjustment: number): string | null {
  if (adjustment === 0) return null;
  return adjustment > 0 ? `+${adjustment}` : String(adjustment);
}

export function whsContextNote(countUsed: number): string {
  return `The World Handicap System uses your best ${countUsed || "N"} ${pluralNoun(countUsed || 2, "differential")} from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.`;
}

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

/** "Blue Rock · Apr 18": where and when a milestone was set. */
export function milestoneWhere(milestone: Milestone): string {
  return [formatCourseName(milestone.course), formatDayShort(milestone.date)].filter(Boolean).join(" · ");
}
