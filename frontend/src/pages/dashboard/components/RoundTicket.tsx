import { ChevronRight } from "lucide-react";
import { HoleScoreBars, ScoreCountChip, ToParFigure } from "@/brand";
import { cn } from "@/brand/cn";
import { playedScoreKinds, scoreKindCountLabel, type Round } from "@/domain";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateShort } from "@/lib/roundDate";

interface RoundTicketProps {
  round: Round;
  onClick?: () => void;
}

/** The round just played, as a ticket: where and when, the number, a bar per hole and what it held. */
export function RoundTicket({ round, onClick }: RoundTicketProps) {
  const courseName = round.course?.name ? formatCourseName(round.course.name) : "Unknown course";
  const kinds = playedScoreKinds(round.scoreCounts);

  return (
    <button
      type="button"
      data-slot="round-ticket"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full flex-col gap-3.5 rounded-card border border-border bg-card p-4 text-left",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
            Last Round
          </div>
          <div className="truncate text-lg font-bold leading-tight tracking-name text-card-foreground">
            {courseName}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatRoundDateShort(round.date) ?? "—"}</span>
            {round.teeBox && (
              <>
                <span aria-hidden className="size-1 rounded-full bg-current opacity-50" />
                <span>{round.teeBox}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-4xl font-semibold leading-none tracking-stat text-card-foreground">
            {round.score ?? "—"}
          </span>
          <ToParFigure toPar={round.toPar} />
        </div>
      </div>

      {round.holes.length > 0 && (
        <div className="w-full">
          <HoleScoreBars holes={round.holes} variant="profile" />
          <div className="mt-1 flex justify-between text-caption text-muted-foreground">
            <span>1</span>
            <span>{Math.ceil(round.holes.length / 2)}</span>
            <span>{round.holes.length}</span>
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-3 border-t border-dashed border-border pt-3">
        <div className="flex flex-wrap gap-1.5">
          {kinds.map(({ kind, count }) => (
            <ScoreCountChip key={kind} kind={kind} count={count}>
              {scoreKindCountLabel(kind, count)}
            </ScoreCountChip>
          ))}
        </div>
        {onClick && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary group-hover:underline">
            Open card
            <ChevronRight aria-hidden className="size-icon-xs" />
          </span>
        )}
      </div>
    </button>
  );
}
