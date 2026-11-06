/**
 * `new Date("2026-06-15")` is UTC midnight, which is the evening before in the
 * Americas, so a date-only string never goes to `Date` here. A string with an
 * offset ("…Z", "…+00:00") is a moment, and reads as the viewer's day.
 */

const DAY_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](.*))?$/;
const OFFSET_PATTERN = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

/** Noon, so a day never slips across midnight when the clocks change. */
function localNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12);
}

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

export function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDayShort(input: DayInput): string | null {
  const day = toDay(input);
  return day ? day.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
}

export function formatDay(input: DayInput): string | null {
  const day = toDay(input);
  return day ? day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
}

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
  month: string;
  day: string;
  year: string;
}

export function dayParts(input: DayInput): DayParts | null {
  const day = toDay(input);
  if (!day) return null;
  return {
    month: day.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: String(day.getDate()),
    year: `'${String(day.getFullYear()).slice(2)}`,
  };
}

export function formatDayTick(input: DayInput): string | null {
  const day = toDay(input);
  return day ? isoDay(day).slice(5) : null;
}
