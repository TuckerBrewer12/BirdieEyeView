export function pluralNoun(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count.toLocaleString("en-US")} ${pluralNoun(count, singular, plural)}`;
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${digits === 0 ? Math.round(value) : value.toFixed(digits)}%`;
}

export function formatSignedOneDecimal(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function formatOneDecimal(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : "—";
}
