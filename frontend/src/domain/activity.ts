export interface ActivityDay {
  date: string;
  dayNum: number;
  count: number;
  inFuture: boolean;
}

const WEEKS = 5;
const DAYS_IN_WEEK = 7;
const SATURDAY = 6;

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date | null {
  let clean = dateStr;
  if (clean.includes("T")) clean = clean.split("T")[0];
  clean = clean.replace(/\//g, "-").replace(/ /g, "-");
  const parts = clean.split("-");
  if (parts.length === 3) {
    const parsed = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      12,
    );
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Counts rounds on each local calendar day in the 5-week window that ends
 * on the Saturday of this week. Days after today stay in the grid as future.
 */
export function activityDays(
  rounds: { date: string | null }[],
  todayInput: Date = new Date(),
): ActivityDay[] {
  const today = new Date(todayInput);
  today.setHours(12, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const round of rounds) {
    if (!round.date) continue;
    const parsed = parseLocalDate(round.date);
    if (!parsed) continue;
    const dateStr = formatLocalDate(parsed);
    counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
  }

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (SATURDAY - today.getDay()));

  const daysOfHistory = WEEKS * DAYS_IN_WEEK;
  const currentDay = new Date(endDate);
  currentDay.setDate(currentDay.getDate() - daysOfHistory + 1);
  currentDay.setHours(12, 0, 0, 0);

  const days: ActivityDay[] = [];
  for (let i = 0; i < daysOfHistory; i++) {
    const dateStr = formatLocalDate(currentDay);
    days.push({
      date: dateStr,
      dayNum: currentDay.getDate(),
      count: counts.get(dateStr) ?? 0,
      inFuture: currentDay.getTime() > today.getTime(),
    });
    currentDay.setDate(currentDay.getDate() + 1);
  }
  return days;
}
