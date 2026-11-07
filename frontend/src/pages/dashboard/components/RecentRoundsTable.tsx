import { RowButton } from "@/brand";
import { cn } from "@/brand/cn";
import { toParBadgeClass, toParDisplay } from "@/brand/theme";
import { formatCourseName } from "@/domain/course";
import type { RoundSummary } from "@/domain";

interface RecentRoundsTableProps {
  rounds: RoundSummary[];
  onRoundClick?: (roundId: string) => void;
}

export function RecentRoundsTable({ rounds, onRoundClick }: RecentRoundsTableProps) {
  return (
    <div data-slot="recent-rounds-table">
      <div className="grid grid-cols-recent-rounds gap-x-3 bg-muted/strong text-left">
        <div className="py-3 pl-3 text-eyebrow uppercase text-muted-foreground">
          Course
        </div>
        <div className="py-3 text-center text-eyebrow uppercase text-muted-foreground">
          Total
        </div>
        <div className="py-3 pr-3 text-center text-eyebrow uppercase text-muted-foreground">
          To Par
        </div>
      </div>
      <div className="divide-y divide-border">
        {rounds.map((r) => {
          const clickable = Boolean(onRoundClick);
          return (
            <RowButton
              key={r.id}
              disabled={!clickable}
              onClick={() => onRoundClick?.(r.id)}
              className={cn(
                "grid w-full grid-cols-recent-rounds gap-x-3",
                clickable
                  ? "cursor-pointer hover:bg-muted active:bg-muted/strong"
                  : "cursor-default",
              )}
            >
              <span className="truncate py-3.5 pr-2 pl-3 text-sm font-semibold text-card-foreground">
                {r.course?.name ? formatCourseName(r.course.name) : "—"}
              </span>
              <span className="py-3.5 text-center text-sm font-bold text-card-foreground">
                {r.score ?? "—"}
              </span>
              <span className="py-3.5 pr-3 text-center text-sm">
                <span
                  className={cn(
                    "inline-block rounded-full px-1.5 py-0.5 text-label font-semibold",
                    toParBadgeClass(r.toPar),
                  )}
                >
                  {toParDisplay(r.toPar)}
                </span>
              </span>
            </RowButton>
          );
        })}
      </div>
    </div>
  );
}
