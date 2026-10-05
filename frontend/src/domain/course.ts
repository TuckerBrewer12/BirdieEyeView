import type { Course, Hole, Tee } from "@/types/golf";

export const FRONT_HOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const BACK_HOLES = [10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
export const ALL_HOLES = [...FRONT_HOLES, ...BACK_HOLES] as const;

export type YardageSource = {
  total_yardage?: number | null;
  hole_yardages: Record<number, number>;
};

type HasTees<T extends { color: string | null }> = { tees: T[] };
type HasHoles<T extends { number: number | null }> = { holes: T[] };
type HasPar = { par: number | null; holes: Hole[] };

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

/** Stored par if present; otherwise the sum of hole pars when every hole has one. */
export function coursePar(course: HasPar | null | undefined): number | null {
  if (!course) return null;
  if (course.par != null) return course.par;
  if (course.holes.length === 0 || course.holes.some((hole) => hole.par == null)) return null;
  return course.holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0);
}

export function teeColors(course: Course | null | undefined): string[] {
  return course?.tees.map((tee) => tee.color).filter((color): color is string => !!color) ?? [];
}

/** Colour words a tee's name is read for, in match order. "combo" names a mixed tee. */
export const TEE_COLORS = [
  "black", "blue", "white", "gold", "red", "green", "silver",
  "yellow", "orange", "purple", "brown", "combo",
] as const;

export type TeeColor = (typeof TEE_COLORS)[number];

/** The colour word in a tee's name: "Back Blue" is blue. Null when it names no colour. */
export function extractTeeColorToken(value: string | null | undefined): TeeColor | null {
  const text = (value ?? "").toLowerCase();
  if (!text) return null;
  return TEE_COLORS.find((token) => text.includes(token)) ?? null;
}

/** The tee among `teeColors` that `current` names: the same name, else the same colour word. */
export function chooseCompatibleTee(current: string, teeColors: string[]): string | null {
  const trimmed = current.trim();
  if (!trimmed || teeColors.length === 0) return null;
  const exact = teeColors.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const currentToken = extractTeeColorToken(trimmed);
  if (!currentToken) return null;
  return teeColors.find((c) => extractTeeColorToken(c) === currentToken) ?? null;
}

export function teeYards(tee: YardageSource | null | undefined): number | null {
  if (!tee) return null;
  if (tee.total_yardage != null) return tee.total_yardage;
  const values = Object.values(tee.hole_yardages);
  if (values.length === 0) return null;
  return values.reduce((sum, yards) => sum + yards, 0);
}

export function teeYardsForHoles(tee: YardageSource, holes: readonly number[]): number {
  return holes.reduce((sum, number) => sum + (tee.hole_yardages[number] ?? 0), 0);
}

export function longestTee(course: Course): Tee | null {
  return course.tees.reduce<Tee | null>((best, tee) => {
    if (!best) return tee;
    return (teeYards(tee) ?? -1) > (teeYards(best) ?? -1) ? tee : best;
  }, null);
}
