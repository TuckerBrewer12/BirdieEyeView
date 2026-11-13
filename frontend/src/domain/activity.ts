import { isoDay, parseDay } from "./date";

export interface ActivityDay {
  date: string;
  dayNum: number;
  /** Ids of the rounds played that day, in the order given. */
  roundIds: string[];
}

export interface ActivityMonth {
  /** Blank cells before the 1st, so the 1st lands under its weekday (Sunday first). */
  leading: number;
  days: ActivityDay[];
  /** Rounds played in the month. */
  rounds: number;
}

/**
 * One calendar month of play: every day of the month with the rounds played
 * on it, by local calendar day. `monthIndex` is 0-11, as `Date` reads it.
 */
export function activityMonth(
  rounds: { id: string; date: string | null }[],
  year: number,
  monthIndex: number,
): ActivityMonth {
  const byDay = new Map<string, string[]>();
  for (const round of rounds) {
    const parsed = parseDay(round.date);
    if (!parsed) continue;
    const key = isoDay(parsed);
    byDay.set(key, [...(byDay.get(key) ?? []), round.id]);
  }

  const dayCount = new Date(year, monthIndex + 1, 0).getDate();
  const days: ActivityDay[] = [];
  let played = 0;
  for (let dayNum = 1; dayNum <= dayCount; dayNum++) {
    const date = isoDay(new Date(year, monthIndex, dayNum, 12));
    const roundIds = byDay.get(date) ?? [];
    played += roundIds.length;
    days.push({ date, dayNum, roundIds });
  }

  return { leading: new Date(year, monthIndex, 1, 12).getDay(), days, rounds: played };
}
