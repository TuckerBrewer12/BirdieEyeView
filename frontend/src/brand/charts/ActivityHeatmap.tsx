import { useMemo } from "react";
import type { RoundSummary } from "@/types/golf";
import { pluralize } from "@/lib/pluralize";
import { cn } from "@/brand/cn";
import { activityDays } from "@/domain/activity";

interface ActivityHeatmapProps {
  rounds?: RoundSummary[];
  /** Frozen in previews so the calendar does not drift day to day. */
  today?: Date;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function ActivityHeatmap({ rounds = [], today }: ActivityHeatmapProps) {
  const layout = useMemo(
    () => activityDays(rounds, today ?? new Date()),
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
