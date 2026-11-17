import {
  formatCourseName,
  formatDayShort,
  formatHandicapIndex,
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

export function whsContextNote(countUsed: number, windowSize: number): string {
  if (countUsed === 0) {
    return `An index needs 3 rounds that count. You have ${windowSize}.`;
  }
  const best = countUsed === 1 ? "your best differential" : `the average of your best ${countUsed} differentials`;
  if (windowSize >= 20) {
    return `The World Handicap System uses ${best} from your last 20 rounds.`;
  }
  return `With ${windowSize} ${pluralNoun(windowSize, "round")} that count, the World Handicap System uses ${best}. At 20 rounds it uses the average of your best 8.`;
}

export function whsFormulaNote(hasRatedRounds: boolean): string | null {
  if (!hasRatedRounds) return null;
  return "Each round’s differential is (score − course rating) × 113 ÷ slope rating. A round with no course rating or slope uses its score to par.";
}

export function whsExcludedNote(excludedCount: number, startingHandicap: number | null): string | null {
  if (excludedCount === 0) return null;
  const rounds = excludedCount === 1 ? "1 round doesn’t" : `${excludedCount} rounds don’t`;
  const handicap = startingHandicap != null ? ` of ${formatHandicapIndex(startingHandicap)}` : "";
  return `${rounds} count. Rounds from before you set your starting handicap${handicap} only count when they beat it.`;
}

export function whsRowNote(row: WhsRound): string | null {
  return row.excluded ? "Before your starting handicap" : null;
}

export function whsRowStatusLabel(row: WhsRound): string {
  if (row.used) return "Counts toward index";
  return row.excluded ? "Doesn’t count: before your starting handicap" : "Not counted";
}
