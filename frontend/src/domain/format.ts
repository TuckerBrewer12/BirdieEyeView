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

export function formatSigned(value: number, digits = 1): string {
  const amount = Math.abs(value).toFixed(digits);
  if (value > 0) return `+${amount}`;
  if (value < 0) return `\u2212${amount}`;
  return amount;
}

export function formatOneDecimal(value: number | null | undefined): string {
  return value != null ? value.toFixed(1) : "—";
}

export function formatTwoDecimals(value: number | null | undefined): string {
  return value != null ? value.toFixed(2) : "—";
}

export function formatWhole(value: number | null | undefined): string {
  return value != null ? value.toFixed(0) : "—";
}

export function formatCount(value: number | null | undefined): string {
  return value != null ? value.toLocaleString("en-US") : "—";
}

export function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export function formatScorecardFigure(value: number | null | undefined): string {
  return value == null ? "-" : String(value);
}
