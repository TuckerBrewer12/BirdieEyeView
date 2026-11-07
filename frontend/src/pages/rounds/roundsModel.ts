import { formatCourseName } from "@/domain/course";

export type SortKey = "date" | "total_score" | "to_par" | "course_name";
export type FilterMode = "all" | "l20" | "best" | string;

export interface Sort {
  key: SortKey;
  ascending: boolean;
}

export interface CourseFilterOption {
  key: string;
  label: string;
  mode: FilterMode;
  /** How many listed rounds the chip leaves; set on course chips only. */
  count?: number;
}

export interface SortOption {
  value: SortKey;
  label: string;
}

/** The fields the rounds list reads, and nothing else. */
export interface ListedRound {
  date: string | null;
  score: number | null;
  toPar: number | null;
  course: { name: string | null } | null;
  /** The server's Best order: full rounds by to par, then nines and rounds cut short. */
  bestRank: number | null;
}

/**
 * The one place a sort key's label is written. Typing it as Record<SortKey, …>
 * makes a new key a compile error until it is labelled here, and SORT_OPTIONS is
 * derived from it so the menu cannot drift from the label on the trigger.
 */
export const SORT_LABELS: Record<SortKey, string> = {
  date: "Date",
  total_score: "Score",
  to_par: "To Par",
  course_name: "Course",
};

export const SORT_OPTIONS: readonly SortOption[] = (
  Object.keys(SORT_LABELS) as SortKey[]
).map((value) => ({ value, label: SORT_LABELS[value] }));

/** Best always lists the best round first, by to par, whatever sort the golfer chose. */
export function effectiveSort(mode: FilterMode, chosen: Sort): Sort & { locked: boolean } {
  return mode === "best"
    ? { key: "to_par", ascending: true, locked: true }
    : { ...chosen, locked: false };
}

/** Picking a sort key leaves Best, since Best would ignore it. */
export function modeAfterPickingSort(mode: FilterMode): FilterMode {
  return mode === "best" ? "all" : mode;
}

/** Picking the current key flips it. A new key starts high-to-low, except course names, which read A–Z. */
export function sortAfterPicking(current: Sort, picked: SortKey): Sort {
  return current.key === picked
    ? { key: picked, ascending: !current.ascending }
    : { key: picked, ascending: picked === "course_name" };
}

/** The scopes over every course: all rounds, the last twenty, the best first. */
export const SCOPE_CHIPS: readonly CourseFilterOption[] = [
  { key: "all", label: "All", mode: "all" },
  { key: "l20", label: "L20", mode: "l20" },
  { key: "best", label: "Best", mode: "best" },
];

/** The six most-played courses, most played first, each with its number of rounds. */
export function courseChips(rounds: readonly ListedRound[]): CourseFilterOption[] {
  const counts = new Map<string, number>();
  for (const r of rounds) {
    const name = r.course?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ key: name, label: formatCourseName(name), mode: name, count }));
}

function sortValue(round: ListedRound, key: SortKey): number | string | null {
  switch (key) {
    case "date":        return round.date ?? "";
    case "total_score": return round.score;
    case "to_par":      return round.toPar;
    case "course_name": return round.course?.name ?? "";
  }
}

/**
 * The rounds a chip, a search and a sort leave on screen, in order. Rounds with no value sort last.
 * Best follows the server's order, which ranks every full round ahead of a nine.
 */
export function filterRounds<R extends ListedRound>(
  rounds: readonly R[],
  mode: FilterMode,
  search: string,
  chosen: Sort,
): R[] {
  let result = [...rounds];
  if (mode === "l20") {
    result = result.sort((a, b) => ((b.date ?? "") > (a.date ?? "") ? 1 : -1)).slice(0, 20);
  } else if (mode !== "all" && mode !== "best") {
    result = result.filter((r) => r.course?.name === mode);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((r) => r.course?.name?.toLowerCase().includes(q));
  }
  const { key, ascending } = effectiveSort(mode, chosen);
  const valueOf = (round: R) => (mode === "best" ? round.bestRank : sortValue(round, key));
  return result.sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av < bv) return ascending ? -1 : 1;
    if (av > bv) return ascending ? 1 : -1;
    return 0;
  });
}
