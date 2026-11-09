import {
  formatCourseName,
  formatDayShort,
  formatOneDecimal,
  formatSignedOneDecimal,
  formatWeekdayShort,
  pluralNoun,
  scoreKindNoun,
  type RoundSummary,
  type ScoreKind,
} from "@/domain";
import type { UserDto } from "@/types/api";
import type { BestRound, WhsRound } from "./model";

export function firstNameOf(user: UserDto | null): string {
  return user?.name?.split(" ")[0] ?? "Golfer";
}

/** "Good evening": the greeting for the hour it is where the player is. */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** A figure's move: which way, and how far, unsigned. No move shows nothing. */
export interface Move {
  direction: "up" | "down" | null;
  amount: string;
}

export function moveOf(change: number | null): Move {
  if (change == null || change === 0) return { direction: null, amount: "" };
  return { direction: change < 0 ? "down" : "up", amount: formatOneDecimal(Math.abs(change)) };
}

/** "Last round · Sun, Jun 15" on a wide screen, "Last round · Jun 15" on a phone. */
export function lastRoundLabel(date: string | null, { weekday }: { weekday: boolean }): string {
  const day = weekday ? formatWeekdayShort(date) : formatDayShort(date);
  return day ? `Last round · ${day}` : "Last round";
}

/** "40 · 38 · Blue": the nines' totals and the tee played. */
export function ninesAndTee(round: RoundSummary): string {
  const tee = round.teeBox ? round.teeBox.charAt(0).toUpperCase() + round.teeBox.slice(1) : null;
  return [round.frontNine.total, round.backNine.total, tee].filter((part) => part != null).join(" · ");
}

/** "pars" in "10 pars": the word after a count of holes, lower case as it reads in a sentence. */
export function countNoun(kind: ScoreKind, count: number): string {
  return scoreKindNoun(kind, count).toLowerCase();
}

export function courseLabel(course: string | null | undefined): string {
  return course ? formatCourseName(course) : "Unknown course";
}

/** "Blue Rock · Apr 18": where and when the best round was. */
export function bestWhere(best: BestRound): string {
  return [best.course ? formatCourseName(best.course) : null, formatDayShort(best.date)].filter(Boolean).join(" · ");
}

/** "Best · Blue Rock": the phone's best-round label. */
export function bestLabel(best: BestRound | null): string {
  return best?.course ? `Best · ${formatCourseName(best.course)}` : "Best";
}

/** The goal's verdict. */
export function goalStatusLabel(onTrack: boolean): string {
  return onTrack ? "On track" : "Not yet";
}

/** "On track · 4 rounds this season": the phone's goal line. */
export function goalSeasonLine(onTrack: boolean, seasonRounds: number): string {
  return `${goalStatusLabel(onTrack)} · ${seasonRounds} ${pluralNoun(seasonRounds, "round")} this season`;
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
