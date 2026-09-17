import { useMemo } from "react";
import type { RoundSummary } from "@/types/golf";
import { pluralize } from "@/lib/pluralize";
import { cn } from "@/brand/cn";

export interface HeatmapDay {
  date: string;
  dayNum: number;
  count: number;
  inFuture: boolean;
}

interface ActivityHeatmapProps {
  rounds?: RoundSummary[];
  /** Frozen in previews so the calendar does not drift day to day. */
  today?: Date;
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

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function ActivityHeatmap({ rounds = [], today }: ActivityHeatmapProps) {
  const layout = useMemo(
    () => buildActivityHeatmapDays(rounds, today ?? new Date()),
    [rounds, today],
  );

  return (
    <div data-slot="activity-heatmap" className="flex w-full flex-col items-center px-2">
      <div className="grid w-full grid-cols-7 justify-items-center gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="mb-1 text-meta font-bold text-muted-foreground">
            {d}
          </div>
        ))}

        {layout.map((day, i) => {
          const isActive = day.count > 0;
          return (
            <div
              key={i}
              title={day.inFuture ? "" : `${pluralize(day.count, "round")} on ${day.date}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-lg text-label font-semibold transition-all",
                isActive
                  ? "bg-score-birdie text-primary-foreground ring-1 ring-score-birdie/50"
                  : day.inFuture
                    ? "bg-transparent text-transparent"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {!day.inFuture && day.dayNum}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex w-full items-center justify-center gap-4 text-label font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-muted" />
          <span>No Round</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-score-birdie" />
          <span>Played</span>
        </div>
      </div>
    </div>
  );
}
