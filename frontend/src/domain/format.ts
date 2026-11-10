/** Counts, percentages and plain figures, written the same way on every page. */

/** The noun for `count` of a thing, for callers that render the count themselves: "Birdie", "Birdies". */
export function pluralNoun(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** A count with its noun: "1 round", "12 courses", "1,432 holes". */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count.toLocaleString("en-US")} ${pluralNoun(count, singular, plural)}`;
}

/** A percentage, whole by default: "31%", "31.4%". A dash when there is nothing to show. */
export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${digits === 0 ? Math.round(value) : value.toFixed(digits)}%`;
}

/** A figure to one decimal with its sign, like a differential: "+1.2", "-0.4". */
export function formatSignedOneDecimal(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

/** A figure to one decimal, like a scoring average: "82.4". A dash when there is nothing to show. */
export function formatOneDecimal(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : "—";
}

/** A figure rounded to a whole number, for a rate shown beside its own unit: "31". A dash when there is nothing to show. */
export function formatWhole(value: number | null | undefined): string {
  return value != null ? value.toFixed(0) : "—";
}

/** A count on its own, grouped by thousands: "6,697". A dash when there is nothing to show. */
export function formatCount(value: number | null | undefined): string {
  return value != null ? value.toLocaleString("en-US") : "—";
}

/** A file's size in whole kilobytes: "412 KB". */
export function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}
