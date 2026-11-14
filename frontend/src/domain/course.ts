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

const TRAILING_RATING = /^(.*?)[\s,]*\(?(\d{2}(?:\.\d)?)\s*\/\s*(\d{2,3})\)?\s*$/;

export function teeNameParts(tee: string): { name: string; rating: string | null } {
  const match = TRAILING_RATING.exec(tee.trim());
  if (!match || !match[1]) return { name: formatCourseName(tee), rating: null };
  return { name: formatCourseName(match[1]), rating: `${match[2]} / ${match[3]}` };
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

