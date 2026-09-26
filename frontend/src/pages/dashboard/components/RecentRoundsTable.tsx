import { cn } from "@/brand/cn";
import { toParBadgeClass, toParLabel } from "@/brand/theme";
import { formatCourseName } from "@/lib/courseName";
import { roundScore, roundToPar, type Round } from "@/domain";

interface RecentRoundsTableProps {
  rounds: Round[];
  onRoundClick?: (roundId: string) => void;
}

export function RecentRoundsTable({ rounds, onRoundClick }: RecentRoundsTableProps) {
  return (
    <div data-slot="recent-rounds-table">
      <div className="grid grid-cols-recent-rounds gap-x-3 bg-muted/60 text-left">
        <div className="py-3 pl-3 text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
          Course
        </div>
        <div className="py-3 text-center text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
          Total
        </div>
        <div className="py-3 pr-3 text-center text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
          To Par
        </div>
      </div>
      <div className="divide-y divide-border">
        {rounds.map((r) => {
          const clickable = Boolean(onRoundClick);
          const toPar = roundToPar(r);
          return (
            <button
              key={r.id}
              type="button"
              disabled={!clickable}
              onClick={() => onRoundClick?.(r.id)}
              className={cn(
                "grid w-full grid-cols-recent-rounds gap-x-3 text-left transition-colors",
                clickable
                  ? "cursor-pointer hover:bg-muted active:bg-muted/80"
                  : "cursor-default",
              )}
            >
              <span className="truncate py-3.5 pr-2 pl-3 text-sm font-semibold text-card-foreground">
                {r.course?.name ? formatCourseName(r.course.name) : "—"}
              </span>
              <span className="py-3.5 text-center text-sm font-bold text-card-foreground">
                {roundScore(r) ?? "—"}
              </span>
              <span className="py-3.5 pr-3 text-center text-sm">
                <span
                  className={cn(
                    "inline-block rounded-full px-1.5 py-0.5 text-label font-semibold",
                    toParBadgeClass(toPar),
                  )}
                >
                  {toParLabel(toPar) ?? "—"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
