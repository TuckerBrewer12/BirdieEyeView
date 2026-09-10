/**
 * Counts a noun for display: `pluralize(1, "round")` gives "1 round",
 * `pluralize(12, "round")` gives "12 rounds".
 *
 * Pass `plural` for nouns that do not just take an -s.
 */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
