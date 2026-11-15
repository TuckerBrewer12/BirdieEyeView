import { formatCourseName } from "@/domain/course";

export type Scope = "all" | "last20" | "best";

export type SortKey = "newest" | "oldest" | "best" | "worst" | "course";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export interface ListedRound {
  date: string | null;
  toPar: number | null;
  course: { name: string | null } | null;
  bestRank: number | null;
  worstRank: number | null;
}

export const SCOPE_OPTIONS: readonly Option<Scope>[] = [
  { value: "all", label: "All" },
  { value: "last20", label: "Last 20" },
  { value: "best", label: "Best" },
];

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

export const ALL_COURSES = "";
export const ALL_COURSES_LABEL = "All courses";

export function effectiveSort(scope: Scope, chosen: SortKey): SortKey {
  return scope === "best" ? "best" : chosen;
}

export function scopeAfterPickingSort(scope: Scope): Scope {
  return scope === "best" ? "all" : scope;
}

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

const SORTS: Record<SortKey, { value: (round: ListedRound) => number | string | null; ascending: boolean }> = {
  newest: { value: (r) => r.date ?? "", ascending: false },
  oldest: { value: (r) => r.date ?? "", ascending: true },
  best: { value: (r) => r.bestRank, ascending: true },
  worst: { value: (r) => r.worstRank, ascending: true },
  course: { value: (r) => r.course?.name?.toLowerCase() ?? null, ascending: true },
};

export interface RoundsQuery {
  scope: Scope;
  course: string;
  search: string;
  sort: SortKey;
}

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
