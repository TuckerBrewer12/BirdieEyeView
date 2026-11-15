import { Trophy } from "lucide-react";
import { EmptyNote, HoleScoreShapes, RowButton, StatValue, ToParFigure } from "@/brand";
import { cn } from "@/brand/cn";
import { courseLabel, formatDayShort, type RoundSummary } from "@/domain";

interface RoundHighlightProps {
  round: RoundSummary | null;
  onClick?: () => void;
}

export function RoundHighlight({ round, onClick }: RoundHighlightProps) {
  if (!round) {
    return (
      <EmptyNote data-slot="round-highlight" className="p-4">
        Play a round to unlock highlights!
      </EmptyNote>
    );
  }

  return (
    <RowButton
      data-slot="round-highlight"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group flex w-full flex-wrap items-center gap-4",
        onClick ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-score-eagle/recessed bg-score-eagle/tint text-score-eagle">
          <Trophy className="size-5" />
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-eyebrow text-muted-foreground">
            Best Recent Round
          </div>
          <div className="font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {courseLabel(round.course?.name)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatDayShort(round.date) ?? "—"}
            {round.toPar != null && (
              <>
                {" · "}
                <ToParFigure toPar={round.toPar} size="inherit" className="font-semibold" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 overflow-x-auto">
        <HoleScoreShapes round={round} />
      </div>

      <div className="shrink-0 text-right">
        <StatValue size="card" className="justify-end transition-colors group-hover:text-primary">
          {round.score ?? "—"}
        </StatValue>
      </div>
    </RowButton>
  );
}
