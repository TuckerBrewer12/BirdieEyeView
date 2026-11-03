import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RoundSummary } from "@/domain";
import { pluralize } from "@/domain/format";
import { cn } from "@/brand/cn";
import { activityMonth } from "@/domain/activity";

interface ActivityHeatmapProps {
  rounds?: RoundSummary[];
  /** Picks the month it opens on. Frozen in previews so the calendar does not drift. */
  today?: Date;
  /** Makes a played day a button that opens its round (the first, when it has two). */
  onOpenRound?: (roundId: string) => void;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

const navButton =
  "flex size-7 items-center justify-center rounded-md text-foreground-secondary transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** A month of play: a green dot on each day with a round. Step through months with the arrows. */
export function ActivityHeatmap({ rounds = [], today, onOpenRound }: ActivityHeatmapProps) {
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

  const title = new Date(shown.year, shown.month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div data-slot="activity-heatmap" className="flex w-full flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" className={navButton} onClick={() => step(-1)}>
            <ChevronLeft className="size-3" strokeWidth={3} />
          </button>
          <div className="min-w-26 text-center text-sm font-semibold text-foreground">{title}</div>
          <button type="button" aria-label="Next month" className={navButton} onClick={() => step(1)}>
            <ChevronRight className="size-3" strokeWidth={3} />
          </button>
        </div>
        <div className="text-body-sm text-foreground-secondary">
          <b className="text-sm font-bold text-foreground">{month.rounds.toLocaleString("en-US")}</b>{" "}
          {month.rounds === 1 ? "round" : "rounds"}
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
          const circle = cn(
            "inline-flex size-7.5 items-center justify-center rounded-full text-body-sm",
            played ? "bg-primary font-bold text-primary-foreground" : "font-medium text-foreground-secondary",
          );
          return (
            <div key={day.date} className="flex h-8 items-center justify-center">
              {played && onOpenRound ? (
                <button
                  type="button"
                  title={hint}
                  aria-label={`Open round on ${day.date}`}
                  onClick={() => onOpenRound(day.roundIds[0])}
                  className={cn(circle, "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}
                >
                  {day.dayNum}
                </button>
              ) : (
                <span title={hint} className={circle}>
                  {day.dayNum}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 pt-0.5 text-label text-muted-foreground">
        <span className="size-2 rounded-full bg-primary" />
        {onOpenRound ? "Played · tap a day to open the round" : "Played"}
      </div>
    </div>
  );
}
