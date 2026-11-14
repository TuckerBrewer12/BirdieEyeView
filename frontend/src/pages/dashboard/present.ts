import {
  formatCourseName,
  formatDayShort,
  formatSigned,
  formatWeekday,
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

export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function lastRoundLabel(date: string | null, { weekday }: { weekday: boolean }): string {
  const day = weekday ? formatWeekday(date, { year: false }) : formatDayShort(date);
  return day ? `Last round · ${day}` : "Last round";
}

export function ninesAndTee(round: RoundSummary): string {
  const tee = round.teeBox ? round.teeBox.charAt(0).toUpperCase() + round.teeBox.slice(1) : null;
  return [round.frontNine.total, round.backNine.total, tee].filter((part) => part != null).join(" · ");
}

export function countNoun(kind: ScoreKind, count: number): string {
  return scoreKindNoun(kind, count).toLowerCase();
}

export function bestWhere(best: BestRound): string {
  return [best.course ? formatCourseName(best.course) : null, formatDayShort(best.date)].filter(Boolean).join(" · ");
}

export function bestLabel(best: BestRound | null): string {
  return best?.course ? `Best · ${formatCourseName(best.course)}` : "Best";
}

export function goalStatusLabel(onTrack: boolean): string {
  return onTrack ? "On track" : "Not yet";
}

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

export function scoreAndRatingForWhs(row: WhsRound): string {
  return [row.score != null ? String(row.score) : "—", ratingLabelForWhs(row)].filter(Boolean).join(" · ");
}

export function differentialLabel(value: number | null): string {
  return value != null ? formatSigned(value) : "—";
}

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
