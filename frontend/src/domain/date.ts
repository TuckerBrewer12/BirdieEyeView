/**
 * Dates as the app reads and writes them. A round's date is a calendar day: the
 * server sends "2026-06-15T00:00:00", fixtures and forms use "2026-06-15", career
 * events "2026/6/15". Each names the same day in every timezone.
 *
 * `new Date("2026-06-15")` is UTC midnight, which is the evening before in the
 * Americas, so a date-only string never goes to `Date` here. A string with an
 * offset ("…Z", "…+00:00") is a moment, and reads as the viewer's day.
 *
 * Every formatter takes a string or a `Date`, and gives null for a missing or
 * unreadable date rather than "Invalid Date" on screen.
 */

const DAY_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](.*))?$/;
const OFFSET_PATTERN = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Noon, so a day never slips across midnight when the clocks change. */
function localNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12);
}

/**
 * The calendar day a date string names, as local noon on that day. Null when it
 * can't be read, including a day the month doesn't have (2026-02-31).
 */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DAY_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, time] = match;
  if (time && OFFSET_PATTERN.test(time)) {
    const moment = new Date(value);
    if (Number.isNaN(moment.getTime())) return null;
    return localNoon(moment.getFullYear(), moment.getMonth(), moment.getDate());
  }
  const parsed = localNoon(Number(year), Number(month) - 1, Number(day));
  return parsed.getMonth() === Number(month) - 1 && parsed.getDate() === Number(day) ? parsed : null;
}

type DayInput = string | Date | null | undefined;

function toDay(input: DayInput): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  return parseDay(input);
}

/** "2026-06-15": the local calendar day, as the API and the activity grid key it. */
export function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "Jun 15": compact date on dashboard tickets. */
export function formatDayShort(input: DayInput): string | null {
  const day = toDay(input);
  return day ? day.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
}

/** "October 2026": the activity calendar's month. */
export function formatMonth(input: DayInput): string | null {
  const day = toDay(input);
  return day ? day.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;
}

/** "Jun 15, 2026": round history rows, career records, a friend request's last update. */
export function formatDay(input: DayInput): string | null {
  const day = toDay(input);
  return day ? day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
}

/**
 * "Mon · Jun 15 · 2026": the eyebrow above a round's course name. Without the year,
 * "Mon · Jun 15", as in the dashboard greeting.
 */
export function formatWeekdayDay(input: DayInput, { year = true }: { year?: boolean } = {}): string | null {
  const day = toDay(input);
  if (!day) return null;
  const parts = [
    day.toLocaleDateString("en-US", { weekday: "short" }),
    day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  ];
  if (year) parts.push(String(day.getFullYear()));
  return parts.join(" · ");
}

export interface DayParts {
  /** "JUN" */
  month: string;
  /** "15" */
  day: string;
  /** "'26" */
  year: string;
}

/** The three lines of a calendar tile, as on a round list card. */
export function dayParts(input: DayInput): DayParts | null {
  const day = toDay(input);
  if (!day) return null;
  return {
    month: day.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(day.getDate()),
    year: `'${String(day.getFullYear()).slice(2)}`,
  };
}

/** "06-15": a chart tick. */
export function formatDayTick(input: DayInput): string | null {
  const day = toDay(input);
  return day ? isoDay(day).slice(5) : null;
}
