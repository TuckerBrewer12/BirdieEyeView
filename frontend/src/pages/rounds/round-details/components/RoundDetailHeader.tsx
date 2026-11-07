import { cn } from "@/brand/cn";
import { HoleScoreBars, PageTitle, ScoreCountChip, ToParFigure } from "@/brand";
import { formatCourseHandicap, playedScoreKinds, scoreKindCountLabel, type Nine, type Round } from "@/domain";
import { formatCourseName } from "@/domain/course";
import { formatWeekdayDay } from "@/domain/date";

export interface RoundDetailHeaderProps {
  round: Round;
  /** "72.4 / 130", when the tee is rated. */
  teeRating?: string | null;
  className?: string;
}

function NineBars({ nine, label, className }: {
  nine: Nine;
  label: string;
  className?: string;
}) {
  if (nine.holes.length === 0) return null;
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <HoleScoreBars holes={nine.holes} variant="profile" />
      {nine.total != null && (
        <div className="mt-1 text-kicker uppercase text-muted-foreground">
          {label} <span className="font-mono">{nine.total}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The identity and shape of one round: what was played, when, how it went.
 */
export function RoundDetailHeader({ round, teeRating, className }: RoundDetailHeaderProps) {
  const dateLabel = formatWeekdayDay(round.date);

  return (
    <div data-slot="round-detail-header" className={cn("mb-4", className)}>
      <div className="pb-3.5">
        {dateLabel && (
          <div className="mb-1 text-eyebrow uppercase text-muted-foreground">
            {dateLabel}
          </div>
        )}
        <PageTitle className="pt-0 leading-display">
          {formatCourseName(round.course?.name)}
        </PageTitle>
        {(round.teeBox || teeRating) && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {round.teeBox && <span className="capitalize">{round.teeBox} tees</span>}
            {teeRating && (
              <>
                <span className="inline-block size-dot rounded-full bg-current opacity-50" />
                <span>{teeRating}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-end gap-3.5 border-y border-border py-3.5">
        <div className="flex shrink-0 items-end">
          <div>
            <div className="font-mono text-hero text-foreground">
              {round.score ?? "—"}
            </div>
            <ToParFigure toPar={round.toPar} size="stat" />
          </div>
          {round.courseHandicap != null && round.netScore != null && (
            <>
              <div className="mx-3.5 h-11 w-px shrink-0 bg-border" />
              <div>
                <div className="mb-chip text-caption font-bold uppercase tracking-eyebrow text-muted-foreground">
                  Net · hcp {formatCourseHandicap(round.courseHandicap)}
                </div>
                <div className="font-mono text-lg font-bold leading-none text-primary">{round.netScore}</div>
              </div>
            </>
          )}
        </div>

        {round.holes.length > 0 && (
          <div className="flex min-w-0 flex-1 items-start gap-3.5 overflow-hidden">
            <NineBars nine={round.frontNine} label="Front" />
            <NineBars nine={round.backNine} label="Back" className="mt-1.5" />
          </div>
        )}
      </div>

      {(round.putts != null || round.gir != null || round.stablefordPoints != null) && (
        <div className="flex gap-4 pt-2 font-mono text-xs text-muted-foreground">
          {round.putts != null && (
            <span>
              <span className="font-semibold text-foreground">{round.putts}</span> putts
            </span>
          )}
          {round.gir != null && (
            <span>
              <span className="font-semibold text-primary">{round.gir}</span>/{round.holesPlayed} GIR
            </span>
          )}
          {round.stablefordPoints != null && (
            <span>
              <span className="font-semibold text-primary">{round.stablefordPoints}</span> Stableford pts
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-2.5">
        {playedScoreKinds(round.scoreCounts).map(({ kind, count }) => (
          <ScoreCountChip key={kind} kind={kind} count={count}>
            {scoreKindCountLabel(kind, count)}
          </ScoreCountChip>
        ))}
      </div>
    </div>
  );
}
