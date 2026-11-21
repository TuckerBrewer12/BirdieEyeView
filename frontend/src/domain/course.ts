import type { CourseDto, CourseSummaryDto } from "@/types/api";

export interface CourseSummary {
  id: string;
  name: string | null;
  location: string | null;
  par: number | null;
  holeCount: number;
  teeCount: number;
  tees: string[];
  record: CourseListRecord | null;
  source: "local" | "external";
  externalId: string | null;
}

export interface CourseListRecord {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
}

export function courseSummaryFrom(dto: CourseSummaryDto): CourseSummary {
  return {
    id: dto.id,
    name: dto.name,
    location: dto.location,
    par: dto.par,
    holeCount: dto.total_holes,
    teeCount: dto.tee_count,
    tees: dto.tees,
    record:
      dto.rounds_played > 0
        ? { roundsPlayed: dto.rounds_played, scoringAverage: dto.scoring_average, bestScore: dto.best_score }
        : null,
    source: dto.source,
    externalId: dto.external_course_id,
  };
}

export const FRONT_HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const BACK_HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

type HasTees<T extends { color: string | null }> = { tees: T[] };
type HasHoles<T extends { number: number | null }> = { holes: T[] };

export function courseLabel(name: string | null | undefined): string {
  return name ? formatCourseName(name) : "Unknown course";
}

export function formatCourseName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatTeeName(tee: string): string {
  return `${formatCourseName(tee)} tees`;
}

// A rating and slope as a card prints them after a tee: "70.8/123", "(68.9 / 118)".
const RATING = /(\d{2}(?:\.\d)?)\s*\/\s*(\d{2,3})/g;
// Who a rating is for, when a card prints one per set of players: "M:", "W", "Men's", "Ladies".
const RATED_FOR = String.raw`(m|w|l|men'?s|women'?s|men|women|ladies)`;
const NAME_THEN_FOR = new RegExp(String.raw`^(.*?)[\s(,]+${RATED_FOR}\s*:?[\s(]*$`, "i");
const BETWEEN = new RegExp(String.raw`^[\s(),;|·-]*(?:${RATED_FOR}\s*:?)?[\s()]*$`, "i");

function ratedFor(label: string | undefined): string {
  if (!label) return "";
  return `${label.length === 1 ? label.toUpperCase() : formatCourseName(label)} `;
}

/**
 * A tee as written on a card, split into its name and every rating and slope printed after it:
 * "BLUE 70.8/123" is Blue over "70.8 / 123", and "White M: 69.1/123 W: 74.8 / 133" is White over
 * "M 69.1 / 123" and "W 74.8 / 133". Anything else after the name keeps it whole.
 */
export function teeNameParts(tee: string): { name: string; ratings: string[] } {
  const text = tee.trim();
  const whole = { name: formatCourseName(text), ratings: [] };
  const matches = [...text.matchAll(RATING)];
  if (matches.length === 0) return whole;

  const before = text.slice(0, matches[0].index);
  const named = NAME_THEN_FOR.exec(before);
  const name = (named?.[1] ?? before).replace(/[\s(,:-]+$/, "");
  if (!name) return whole;

  const ratings: string[] = [];
  let label = named?.[2];
  for (const [i, match] of matches.entries()) {
    ratings.push(`${ratedFor(label)}${match[1]} / ${match[2]}`);
    const end = (match.index ?? 0) + match[0].length;
    const gap = text.slice(end, matches[i + 1]?.index ?? text.length);
    const between = BETWEEN.exec(gap);
    if (!between) return whole;
    label = between[1];
  }
  // A label after the last rating is for nothing.
  if (label) return whole;
  return { name: formatCourseName(name), ratings };
}

export function teeRatingLabel(
  tee: { course_rating: number | null; slope_rating: number | null } | null | undefined,
): string | null {
  if (tee?.course_rating == null || tee?.slope_rating == null) return null;
  return `${tee.course_rating} / ${tee.slope_rating}`;
}

export function getTee<T extends { color: string | null }>(
  course: HasTees<T> | null | undefined,
  color: string | null | undefined,
): T | null {
  if (!course || !color) return null;
  return course.tees.find((tee) => tee.color?.toLowerCase() === color.toLowerCase()) ?? null;
}

export function getHole<T extends { number: number | null }>(
  course: HasHoles<T> | null | undefined,
  number: number,
): T | null {
  if (!course) return null;
  return course.holes.find((hole) => hole.number === number) ?? null;
}

export interface TeeChoice {
  name: string;
  yards: number | null;
}

export function teeOptions(course: CourseDto | null | undefined): TeeChoice[] {
  const options: TeeChoice[] = [];
  for (const tee of course?.tees ?? []) {
    if (tee.color) options.push({ name: tee.color, yards: tee.total_yardage });
  }
  return options;
}

export function teeColors(course: CourseDto | null | undefined): string[] {
  return course?.tees.map((tee) => tee.color).filter((color): color is string => !!color) ?? [];
}

const TEE_COLORS = [
  "black", "blue", "white", "gold", "red", "green", "silver",
  "yellow", "orange", "purple", "brown", "combo",
] as const;

export type TeeColor = (typeof TEE_COLORS)[number];

export function extractTeeColorToken(value: string | null | undefined): TeeColor | null {
  const text = (value ?? "").toLowerCase();
  if (!text) return null;
  return TEE_COLORS.find((token) => text.includes(token)) ?? null;
}

export function chooseCompatibleTee(current: string, teeColors: string[]): string | null {
  const trimmed = current.trim();
  if (!trimmed || teeColors.length === 0) return null;
  const exact = teeColors.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const currentToken = extractTeeColorToken(trimmed);
  if (!currentToken) return null;
  return teeColors.find((c) => extractTeeColorToken(c) === currentToken) ?? null;
}

