import * as React from "react";
import { cn } from "@/brand/cn";
import { HoleScoreBars } from "@/brand/charts/HoleScoreBars";
import { RunningToParLine } from "@/brand/charts/RunningToParLine";
import { ScoreMixBar } from "@/brand/charts/ScoreMixBar";
import { BrandMark } from "@/brand/components/BrandMark";
import { Card } from "@/brand/components/Card";
import { Stat, StatLabel, StatUnit, StatValue } from "@/brand/components/Stat";
import { ToParPill } from "@/brand/components/ToParPill";
import { courseLabel, roundDayAndTee, type Round } from "@/domain";
import { formatCount } from "@/domain/format";

interface RoundShareCardProps extends React.ComponentProps<"div"> {
  round: Round;
}

interface ShareFigure {
  label: string;
  value: string;
  unit?: string;
}

function shareFigures(round: Round): ShareFigure[] {
  const figures: (ShareFigure | null)[] = [
    round.putts != null ? { label: "Putts", value: round.putts.toString() } : null,
    round.gir != null ? { label: "Greens", value: round.gir.toString(), unit: `/${round.holesPlayed}` } : null,
    round.netScore != null ? { label: "Net", value: round.netScore.toString() } : null,
  ];
  return figures.filter((figure) => figure != null);
}

function parAndYards(round: Round): string | null {
  const parts = [
    round.par != null ? `Par ${round.par}` : null,
    round.yards != null ? `${formatCount(round.yards)} yds` : null,
  ].filter((part) => part != null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

const RoundShareCard = React.forwardRef<HTMLDivElement, RoundShareCardProps>(
  ({ round, className, ...props }, ref) => {
    const when = roundDayAndTee(round);
    const course = parAndYards(round);
    const figures = shareFigures(round);

    return (
      <div
        ref={ref}
        data-slot="round-share-card"
        className={cn("flex w-preview flex-col items-center gap-4 bg-background p-5 font-sans antialiased", className)}
        {...props}
      >
        <Card className="w-full gap-0 py-0">
          <div className="flex flex-col gap-4 px-5 pt-5 pb-4">
            <div className="min-w-0">
              {when && <p className="text-body-sm text-muted-foreground">{when}</p>}
              <p className="mt-0.5 truncate text-name">{courseLabel(round.course?.name)}</p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="flex items-baseline gap-2.5">
                <span className="text-scoreboard-sm">{round.score ?? "—"}</span>
                <ToParPill toPar={round.toPar} size="lg" />
              </div>
              {course && <p className="pb-1.5 text-body-sm text-muted-foreground">{course}</p>}
            </div>

            <div className="flex gap-2">
              <HoleScoreBars holes={round.frontNine.holes} size="lg" className="flex-1" />
              <HoleScoreBars holes={round.backNine.holes} size="lg" className="flex-1" />
            </div>

            <RunningToParLine holes={round.holes} compact />

            <ScoreMixBar mix={round.scoreCounts} counted />
          </div>

          {figures.length > 0 && (
            <div className="flex divide-x divide-border border-t border-border">
              {figures.map((figure) => (
                <Stat key={figure.label} align="center" className="flex-1 py-3">
                  <StatValue size="summary">
                    {figure.value}
                    {figure.unit && <StatUnit>{figure.unit}</StatUnit>}
                  </StatValue>
                  <StatLabel tone="quiet" className="text-body-sm">
                    {figure.label}
                  </StatLabel>
                </Stat>
              ))}
            </div>
          )}
        </Card>

        <BrandMark size="sm" />
      </div>
    );
  },
);
RoundShareCard.displayName = "RoundShareCard";

export { RoundShareCard };
