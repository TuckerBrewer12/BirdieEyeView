export interface HeatmapDay {
  date: string;
  dayNum: number;
  count: number;
  inFuture: boolean;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  let clean = dateStr;
  if (clean.includes("T")) clean = clean.split("T")[0];
  clean = clean.replace(/\//g, "-").replace(/ /g, "-");
  const parts = clean.split("-");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      12,
    );
  }
  return new Date(dateStr);
}

export function buildActivityHeatmapDays(
  rounds: { date: string | null }[],
  todayInput: Date = new Date(),
): HeatmapDay[] {
  const today = new Date(todayInput);
  today.setHours(12, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const r of rounds) {
    if (!r.date) continue;
    const d = parseLocalDate(r.date);
    if (!isNaN(d.getTime())) {
      const dateStr = formatDate(d);
      counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
    }
  }

  const dayOfWeek = today.getDay();
  const offset = 6 - dayOfWeek;
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + offset);

  const daysOfHistory = 5 * 7;
  const currentDay = new Date(endDate);
  currentDay.setDate(currentDay.getDate() - daysOfHistory + 1);
  currentDay.setHours(12, 0, 0, 0);

  const days: HeatmapDay[] = [];
  for (let i = 0; i < daysOfHistory; i++) {
    const dateStr = formatDate(currentDay);
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
