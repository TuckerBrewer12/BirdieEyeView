import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, HoleScoreBars, RunningToParLine, ToParPill } from "@/brand";
import { cn } from "@/brand/cn";
import { scoreCountTextClass, toParDisplay } from "@/brand/theme";
import { courseLabel, playedScoreKinds, type RoundSummary } from "@/domain";
import { countNoun, lastRoundLabel, ninesAndTee } from "../present";

interface LastRoundCardProps {
  round: RoundSummary;
  /** The phone's card: the score beside the course, the round as one strip, a shorter line. */
  compact?: boolean;
  className?: string;
}

/**
 * The dashboard's lead: the newest round, its score, its holes at a glance, how it went hole by
 * hole and what it was made of. Opens the round.
 */
export function LastRoundCard({ round, compact = false, className }: LastRoundCardProps) {
  const toPar = toParDisplay(round.toPar);
  const score = round.score ?? "—";
  const pill = <ToParPill toPar={round.toPar} size={compact ? "md" : "lg"} />;

  return (
    <Card
      data-slot="last-round-card"
      corner={compact ? "lead-phone" : "lead"}
      render={<Link to={`/rounds/${round.id}`} />}
      aria-label={`Last round at ${courseLabel(round.course?.name)}: ${score}, ${toPar}. Open the round`}
      className={cn(compact ? "gap-3.5 px-5 py-6" : "grid grid-cols-last-round gap-8 px-8 py-7", className)}
    >
      {compact ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-body-sm text-muted-foreground">{lastRoundLabel(round.date, { weekday: false })}</div>
              <div className="mt-0.5 truncate text-lg font-semibold">{courseLabel(round.course?.name)}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-scoreboard-sm">{score}</span>
              {pill}
            </div>
          </div>
          <HoleScoreBars holes={round.holes} variant="strip" size="md" />
          <RunningToParLine holes={round.holes} compact />
          <ScoreCounts round={round} action="View" className="gap-3.5" />
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <div className="text-body text-muted-foreground">{lastRoundLabel(round.date, { weekday: true })}</div>
              <div className="mt-1 truncate text-name">{courseLabel(round.course?.name)}</div>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-scoreboard">{score}</span>
              {pill}
              <span className="ml-1 text-sm text-foreground-secondary">{ninesAndTee(round)}</span>
            </div>
            <div className="flex gap-2.5">
              <HoleScoreBars holes={round.frontNine.holes} size="lg" className="flex-1" />
              <HoleScoreBars holes={round.backNine.holes} size="lg" className="flex-1" />
            </div>
            <ScoreCounts round={round} action="View round" className="gap-4" />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <div className="text-body text-muted-foreground">How it went</div>
            <RunningToParLine holes={round.holes} />
          </div>
        </>
      )}
    </Card>
  );
}

/** "1 birdie 10 pars 7 bogeys", each count in its kind's colour, and the way into the round. */
function ScoreCounts({ round, action, className }: { round: RoundSummary; action: string; className?: string }) {
  return (
    <div className={cn("flex flex-wrap text-body text-foreground-secondary", className)}>
      {playedScoreKinds(round.scoreCounts).map(({ kind, count }) => (
        <span key={kind}>
          <b className={cn("font-semibold", scoreCountTextClass(kind))}>{count}</b> {countNoun(kind, count)}
        </span>
      ))}
      <span aria-hidden className="ml-auto flex items-center gap-1 font-semibold text-primary">
        {action}
        <ArrowRight className="size-3.5" />
      </span>
    </div>
  );
}
