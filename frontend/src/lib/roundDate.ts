/**
 * Presentation of a round's date. Every caller gets the same handling of a
 * missing or unparseable date — null, rather than "Invalid Date" on screen.
 */

function parse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** "Jun 15" — compact date on dashboard tickets. */
export function formatRoundDateShort(dateStr: string | null | undefined): string | null {
  const d = parse(dateStr);
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
