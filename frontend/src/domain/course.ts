import type { CourseDto, CourseSummaryDto, TeeDto } from "@/types/api";

export interface CourseSummary {
  id: string;
  name: string | null;
  location: string | null;
  par: number | null;
  holeCount: number;
  teeCount: number;
  source: "local" | "external";
  externalId: string | null;
}

export function courseSummaryFrom(dto: CourseSummaryDto): CourseSummary {
  return {
    id: dto.id,
    name: dto.name,
    location: dto.location,
    par: dto.par,
    holeCount: dto.total_holes,
    teeCount: dto.tee_count,
    source: dto.source,
    externalId: dto.external_course_id,
  };
}

export const FRONT_HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const BACK_HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

type HasTees<T extends { color: string | null }> = { tees: T[] };
type HasHoles<T extends { number: number | null }> = { holes: T[] };

export function formatCourseName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

export function teesByLength(course: CourseDto): TeeDto[] {
  return course.tees
    .filter((tee) => !!tee.color)
    .sort((a, b) => (b.total_yardage ?? 0) - (a.total_yardage ?? 0));
}
