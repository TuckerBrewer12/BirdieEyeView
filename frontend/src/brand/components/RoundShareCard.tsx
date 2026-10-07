import * as React from "react";
import { cn } from "@/brand/cn";
import { HoleScoreShapes } from "@/brand/charts/HoleScoreShapes";
import { BrandMark } from "@/brand/components/BrandMark";
import { ScoreCountChip } from "@/brand/components/ScoreCountChip";
import { Stat, StatLabel, StatValue } from "@/brand/components/Stat";
import { ToParFigure } from "@/brand/components/ToParFigure";
import { SCORE_KEYS, scoreKindLabel } from "@/brand/theme";
import type { Round } from "@/domain";
import { formatCourseName } from "@/lib/courseName";
import { formatRoundDateLong } from "@/lib/roundDate";

interface RoundShareCardProps extends React.ComponentProps<"div"> {
  round: Round;
}

/**
 * A round as an image to share: where and when, the score, every hole marked the way a
 * scorecard marks it, and how the holes added up. A fixed width, because it is captured
 * as a PNG rather than laid out on a page.
 */
const RoundShareCard = React.forwardRef<HTMLDivElement, RoundShareCardProps>(
  ({ round, className, ...props }, ref) => {
    const date = formatRoundDateLong(round.date);
    const counts = SCORE_KEYS.filter((key) => round.scoreCounts[key] > 0);

    return (
      <div
        ref={ref}
        data-slot="round-share-card"
        className={cn(
          "flex w-preview flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-background font-sans antialiased",
          className,
        )}
        {...props}
      >
        <div className="px-5 py-3">
          <BrandMark size="sm" />
        </div>

        <div className="px-5 pt-4 pb-3.5">
          <div className="text-xl leading-tight font-extrabold tracking-title text-foreground">
            {formatCourseName(round.course?.name)}
          </div>
          {date && <div className="mt-0.5 text-xs text-muted-foreground">{date}</div>}

          <div className="mt-3 flex items-end gap-2.5">
            <div className="font-mono text-hero leading-none font-bold tracking-hero text-foreground">
              {round.score ?? "—"}
            </div>
            <div className="pb-1">
              <ToParFigure toPar={round.toPar} size="stat" />
              {(round.par != null || round.yards != null) && (
                <div className="mt-0.5 flex items-center gap-1.5 text-label text-muted-foreground">
                  {round.par != null && <span>par {round.par}</span>}
                  {round.par != null && round.yards != null && <span>·</span>}
                  {round.yards != null && <span>{round.yards.toLocaleString("en-US")} yds</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <HoleScoreShapes round={round} numbered />
        </div>

        {counts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 py-3">
            {counts.map((key) => (
              <ScoreCountChip key={key} kind={key} count={round.scoreCounts[key]}>
                {scoreKindLabel(key, round.scoreCounts[key])}
              </ScoreCountChip>
            ))}
          </div>
        )}

        {(round.putts != null || round.gir != null) && (
          <div className="flex divide-x divide-border">
            {round.putts != null && (
              <Stat align="center" className="flex-1 py-3">
                <StatValue size="sm">{round.putts}</StatValue>
                <StatLabel>Putts</StatLabel>
              </Stat>
            )}
            {round.gir != null && (
              <Stat align="center" className="flex-1 py-3">
                <StatValue size="sm" className="text-primary">
                  {round.gir}/{round.holes.length}
                </StatValue>
                <StatLabel>GIR</StatLabel>
              </Stat>
            )}
          </div>
        )}
      </div>
    );
  },
);
RoundShareCard.displayName = "RoundShareCard";

export { RoundShareCard };
