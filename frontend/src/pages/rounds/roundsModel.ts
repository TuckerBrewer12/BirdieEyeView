import { formatCourseName } from "@/domain/course";

/** Which rounds: every one, the twenty newest, or every one in the server's Best order. */
export type Scope = "all" | "last20" | "best";

/** The five orders the sort menu offers; each names its own direction. */
export type SortKey = "newest" | "oldest" | "best" | "worst" | "course";

export interface Option<T extends string> {
  value: T;
  label: string;
}

/** The fields the rounds list reads, and nothing else. */
export interface ListedRound {
  date: string | null;
  toPar: number | null;
  course: { name: string | null } | null;
  /** The server's Best order: full rounds by to par, then nines and rounds cut short. */
  bestRank: number | null;
  /** The server's Worst order: full rounds furthest over par, then nines and rounds cut short. */
  worstRank: number | null;
}

export const SCOPE_OPTIONS: readonly Option<Scope>[] = [
  { value: "all", label: "All" },
  { value: "last20", label: "Last 20" },
  { value: "best", label: "Best" },
];

/**
 * The one place a sort's label is written. Typing it as Record<SortKey, …> makes a new key a
 * compile error until it is labelled here, and SORT_OPTIONS is derived from it.
 */
export const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  oldest: "Oldest",
  best: "Best score",
  worst: "Worst score",
  course: "Course A–Z",
};

export const SORT_OPTIONS: readonly Option<SortKey>[] = (Object.keys(SORT_LABELS) as SortKey[]).map(
  (value) => ({ value, label: SORT_LABELS[value] }),
);

/** The course menu's "every course" entry: its value, and the words for it. */
export const ALL_COURSES = "";
export const ALL_COURSES_LABEL = "All courses";

/** Best always lists the best round first, whatever sort the golfer chose. */
export function effectiveSort(scope: Scope, chosen: SortKey): SortKey {
  return scope === "best" ? "best" : chosen;
}

/** Picking a sort leaves Best, since Best would ignore it. */
export function scopeAfterPickingSort(scope: Scope): Scope {
  return scope === "best" ? "all" : scope;
}

/** Every course in the golfer's rounds, the most played first, after "All courses". */
export function courseOptions(rounds: readonly ListedRound[]): Option<string>[] {
  const counts = new Map<string, number>();
  for (const r of rounds) {
    const name = r.course?.name;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const courses = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return [
    { value: ALL_COURSES, label: ALL_COURSES_LABEL },
    ...courses.map((name) => ({ value: name, label: formatCourseName(name) })),
  ];
}

const newestFirst = (a: ListedRound, b: ListedRound) => ((b.date ?? "") > (a.date ?? "") ? 1 : -1);

/** Each sort as a value and a direction; a round with no value sorts last either way. */
const SORTS: Record<SortKey, { value: (round: ListedRound) => number | string | null; ascending: boolean }> = {
  newest: { value: (r) => r.date ?? "", ascending: false },
  oldest: { value: (r) => r.date ?? "", ascending: true },
  best: { value: (r) => r.bestRank, ascending: true },
  worst: { value: (r) => r.worstRank, ascending: true },
  course: { value: (r) => r.course?.name?.toLowerCase() ?? null, ascending: true },
};

export interface RoundsQuery {
  scope: Scope;
  /** A course's name, or ALL_COURSES. */
  course: string;
  search: string;
  sort: SortKey;
}

/**
 * The rounds a scope, a course, a search and a sort leave on screen, in order. Last 20 is the
 * twenty newest at the course picked. Best and Worst score follow the server's orders, which
 * rank every full round ahead of a nine either way.
 */
export function filterRounds<R extends ListedRound>(rounds: readonly R[], query: RoundsQuery): R[] {
  let result = [...rounds];
  if (query.course !== ALL_COURSES) {
    result = result.filter((r) => r.course?.name === query.course);
  }
  if (query.scope === "last20") {
    result = result.sort(newestFirst).slice(0, 20);
  }
  if (query.search) {
    const q = query.search.toLowerCase();
    result = result.filter((r) => r.course?.name?.toLowerCase().includes(q));
  }
  const { value, ascending } = SORTS[effectiveSort(query.scope, query.sort)];
  return result.sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    if (av < bv) return ascending ? -1 : 1;
    if (av > bv) return ascending ? 1 : -1;
    return 0;
  });
}
