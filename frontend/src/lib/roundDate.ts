/**
 * Presentation of a round's date. Every caller gets the same handling of a
 * missing or unparseable date — null, rather than "Invalid Date" on screen.
 */

function parse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** "Mon · Jun 15 · 2026" — the eyebrow above a round's course name. */
export function formatRoundDateLong(dateStr: string | null | undefined): string | null {
  const d = parse(dateStr);
  if (!d) return null;
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${weekday} · ${monthDay} · ${d.getFullYear()}`;
}

export interface RoundDateParts {
  /** "JUN" */
  month: string;
  /** "15" */
  day: string;
  /** "'26" */
  year: string;
}

/** The three lines of a calendar tile, as on a round list card. */
export function roundDateParts(dateStr: string | null | undefined): RoundDateParts | null {
  const d = parse(dateStr);
  if (!d) return null;
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    year: `'${String(d.getFullYear()).slice(2)}`,
  };
}

/** "Jun 15, 2026" — round history rows. UTC so the label does not shift by viewer timezone. */
export function formatRoundDateHistory(dateStr: string | null | undefined): string | null {
  const d = parse(dateStr);
  if (!d) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "06-15" — chart tick from an ISO date, independent of timezone. */
export function formatRoundDateTick(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  return match ? `${match[2]}-${match[3]}` : null;
}
