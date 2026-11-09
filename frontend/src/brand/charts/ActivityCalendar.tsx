import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoundSummary } from "@/domain";
import { pluralNoun, pluralize } from "@/domain/format";
import { formatMonth, formatMonthName, isoDay } from "@/domain/date";
import { cn } from "@/brand/cn";
import { Button } from "@/brand/components/Button";
import { activityMonth } from "@/domain/activity";

interface ActivityCalendarProps {
  rounds?: RoundSummary[];
  /** Picks the month it opens on. Frozen in previews so the calendar does not drift. */
  today?: Date;
  /** Opens a played day's round (the first, when it has two). */
  onOpenRound: (roundId: string) => void;
  /**
   * `month` is the dashboard card's: this month under its name, days still to come faded, no
   * arrows and no key. The default steps through months with the arrows.
   */
  variant?: "default" | "month";
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

/** A month of play: a green dot on each day with a round. Step through months with the arrows. */
export function ActivityCalendar({ rounds = [], today, onOpenRound, variant = "default" }: ActivityCalendarProps) {
  const fixed = variant === "month";
  const todayKey = isoDay(today ?? new Date());
  const [shown, setShown] = useState(() => {
    const now = today ?? new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const month = useMemo(() => activityMonth(rounds, shown.year, shown.month), [rounds, shown]);

  const step = (by: number) =>
    setShown(({ year, month: m }) => {
      const next = new Date(year, m + by, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div data-slot="activity-calendar" className={cn("flex w-full flex-col", fixed ? "gap-2.5" : "gap-2")}>
      {fixed ? (
        <div className="flex items-baseline justify-between">
          <div className="text-body-lg font-semibold text-foreground">
            {formatMonthName(new Date(shown.year, shown.month, 1))}
          </div>
          <div className="text-body-sm text-foreground-secondary">
            <b className="font-semibold text-foreground">{month.rounds}</b> {pluralNoun(month.rounds, "round")}
          </div>
        </div>
      ) : (
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
      )}

      <div className={cn("grid grid-cols-7", fixed ? "gap-0.5" : "gap-1")}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className={cn("pb-0.5 text-center font-semibold text-muted-foreground", fixed ? "text-meta" : "text-label")}
          >
            {d}
          </div>
        ))}

        {Array.from({ length: month.leading }, (_, i) => (
          <div key={`lead-${i}`} className={fixed ? "h-7.5" : "h-8"} />
        ))}

        {month.days.map((day) => {
          const played = day.roundIds.length > 0;
          const hint = played ? `${pluralize(day.roundIds.length, "round")} on ${day.date}` : undefined;
          return (
            <div key={day.date} className={cn("flex items-center justify-center", fixed ? "h-7.5" : "h-8")}>
              {played ? (
                <Button
                  size="icon-sm"
                  shape="pill"
                  title={hint}
                  aria-label={`Open round on ${day.date}`}
                  onClick={() => onOpenRound(day.roundIds[0])}
                  className={fixed ? "size-6.5 text-label font-bold" : "text-body-sm font-bold"}
                >
                  {day.dayNum}
                </Button>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center justify-center font-medium",
                    fixed ? "size-6.5 text-label" : "size-7 text-body-sm",
                    fixed && day.date > todayKey ? "text-border-strong" : "text-foreground-secondary",
                  )}
                >
                  {day.dayNum}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!fixed && (
        <div className="flex items-center gap-2 pt-0.5 text-label text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" />
          Played · tap a day to open the round
        </div>
      )}
    </div>
  );
}
