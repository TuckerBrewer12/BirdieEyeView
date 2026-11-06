import { isoDay, parseDay } from "./date";

export interface ActivityDay {
  date: string;
  dayNum: number;
  count: number;
  inFuture: boolean;
}

const WEEKS = 5;
const DAYS_IN_WEEK = 7;
const SATURDAY = 6;

export function activityDays(
  rounds: { date: string | null }[],
  todayInput: Date = new Date(),
): ActivityDay[] {
  const today = new Date(todayInput);
  today.setHours(12, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const round of rounds) {
    if (!round.date) continue;
    const parsed = parseDay(round.date);
    if (!parsed) continue;
    const dateStr = isoDay(parsed);
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
    const dateStr = isoDay(currentDay);
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
