export function pluralNoun(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  return `${count} ${pluralNoun(count, singular, plural)}`;
}
