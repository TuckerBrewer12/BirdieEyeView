import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoundSummary } from "@/domain";
import { pluralNoun, pluralize } from "@/domain/format";
import { formatMonth } from "@/domain/date";
import { Button } from "@/brand/components/Button";
import { activityMonth } from "@/domain/activity";

interface ActivityCalendarProps {
  rounds?: RoundSummary[];
  /** Picks the month it opens on. The screen's view model reads the clock; previews freeze it. */
  today: Date;
  /** Opens a played day's round (the first, when it has two). */
  onOpenRound: (roundId: string) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** A month of play: a green dot on each day with a round. Step through months with the arrows. */
export function ActivityCalendar({ rounds = [], today, onOpenRound }: ActivityCalendarProps) {
  const [shown, setShown] = useState(() => {
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const month = useMemo(() => activityMonth(rounds, shown.year, shown.month), [rounds, shown]);

  const step = (by: number) =>
    setShown(({ year, month: m }) => {
      const next = new Date(year, m + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div data-slot="activity-calendar" className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
            <ChevronLeft className="size-3 stroke-icon-active" />
          </Button>
          <div className="min-w-28 text-center text-sm font-semibold text-foreground">
            {formatMonth(new Date(shown.year, shown.month, 1))}
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => step(1)}>
            <ChevronRight className="size-3 stroke-icon-active" />
          </Button>
        </div>
        <div className="text-body-sm text-foreground-secondary">
          <b className="text-sm font-bold text-foreground">{month.rounds}</b> {pluralNoun(month.rounds, "round")}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="pb-0.5 text-center text-label font-semibold text-muted-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: month.leading }, (_, i) => (
          <div key={`lead-${i}`} className="h-8" />
        ))}

        {month.days.map((day) => {
          const played = day.roundIds.length > 0;
          const hint = played ? `${pluralize(day.roundIds.length, "round")} on ${day.date}` : undefined;
          return (
            <div key={day.date} className="flex h-8 items-center justify-center">
              {played ? (
                <Button
                  size="icon-sm"
                  shape="pill"
                  title={hint}
                  aria-label={`Open round on ${day.date}`}
                  onClick={() => onOpenRound(day.roundIds[0])}
                  className="text-body-sm font-bold"
                >
                  {day.dayNum}
                </Button>
              ) : (
                <span className="inline-flex size-7 items-center justify-center text-body-sm font-medium text-foreground-secondary">
                  {day.dayNum}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-0.5 text-label text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" />
        Played · tap a day to open the round
      </div>
    </div>
  );
}
