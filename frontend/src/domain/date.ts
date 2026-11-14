const DAY_PATTERN = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](.*))?$/;
const OFFSET_PATTERN = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

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

export function formatWeekday(input: DayInput, { year = true }: { year?: boolean } = {}): string | null {
  const day = toDay(input);
  return day
    ? day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(year && { year: "numeric" }) })
    : null;
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
