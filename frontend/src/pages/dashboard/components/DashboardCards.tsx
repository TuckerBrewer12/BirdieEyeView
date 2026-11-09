import { ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, ProgressRing, ScoreMixBar, ScoreMixDonut, Sparkline, StatLabel, StatValue, ToParFigure } from "@/brand";
import { cn } from "@/brand/cn";
import { toParTextClass } from "@/brand/theme";
import { formatOneDecimal, goalTargetLabel, type ScoreMix } from "@/domain";
import { hasScoreMix, type BestRound, type ChangeVerdict, type GoalProgress } from "../model";
import { MoveDelta } from "./MoveDelta";
import { bestLabel, bestWhere, goalSeasonLine, goalStatusLabel } from "../present";

/** Inside a figure card: the soft card's spacing at the size the dashboard's figures sit. */
const CARD = { wide: "gap-1.5 px-5", phone: "gap-1 px-4" } as const;

interface ScoringAverageCardProps {
  average: number | null;
  change: number | null;
  verdict: ChangeVerdict | null;
  /** Each round's five-round average, oldest first. The wide card draws it. */
  line: (number | null)[];
  compact?: boolean;
}

/** The scoring average over the last five rounds, its move, and on a wide screen its line. */
export function ScoringAverageCard({ average, change, verdict, line, compact = false }: ScoringAverageCardProps) {
  return (
    <Card data-slot="scoring-average-card" size={compact ? "default" : "lg"} className={compact ? CARD.phone : CARD.wide}>
      <StatLabel tone="quiet" className={compact ? "text-body-sm" : undefined}>
        {compact ? "Scoring avg" : "Scoring average"}
      </StatLabel>
      <StatValue size={compact ? "card-sm" : "card"} className={compact ? "gap-1.5" : "gap-2"}>
        {formatOneDecimal(average)}
        <MoveDelta change={change} verdict={verdict} className={cn("font-semibold", compact ? "text-body-sm" : "text-body")} />
      </StatValue>
      {!compact && <Sparkline size="card" series={[{ values: line, tone: "primary" }]} />}
    </Card>
  );
}

/** The best round: its score in its to-par's colour, and where and when. Opens the round. */
export function BestRoundCard({ best, compact = false }: { best: BestRound | null; compact?: boolean }) {
  const body = (
    <>
      <StatLabel tone="quiet" className={compact ? "truncate text-body-sm" : undefined}>
        {compact ? bestLabel(best) : "Best round"}
      </StatLabel>
      <StatValue size={compact ? "card-sm" : "card"} className={compact ? "gap-1.5" : "gap-2"}>
        <span className={best ? toParTextClass(best.toPar) : undefined}>{best?.score ?? "—"}</span>
        {best && !compact && <ToParFigure toPar={best.toPar} className="text-body font-semibold" />}
        {best?.roundId && compact && <ArrowRight aria-hidden className="size-3.5 text-primary" />}
      </StatValue>
      {best && !compact && (
        <div className="flex items-center gap-1 text-body font-semibold text-primary">
          {bestWhere(best)}
          {best.roundId && <ArrowRight aria-hidden className="size-3.5" />}
        </div>
      )}
    </>
  );
  return (
    <Card
      data-slot="best-round-card"
      size={compact ? "default" : "lg"}
      render={best?.roundId ? <Link to={`/rounds/${best.roundId}`} /> : undefined}
      interactive={best?.roundId != null}
      className={compact ? CARD.phone : CARD.wide}
    >
      {body}
    </Card>
  );
}

interface ScoreMixCardProps {
  mix: ScoreMix;
  /** The phone's: the mix as one bar across the card. */
  compact?: boolean;
  className?: string;
}

/** How the last five rounds' holes split across score kinds: a ring on a wide screen, a bar on a phone. */
export function ScoreMixCard({ mix, compact = false, className }: ScoreMixCardProps) {
  return (
    <Card
      data-slot="score-mix-card"
      size={compact ? "default" : "lg"}
      className={cn(compact ? "gap-2.5 px-4" : "gap-3 px-5", className)}
    >
      <StatLabel tone="quiet" className={compact ? "text-body-sm" : undefined}>
        Score mix · last 5
      </StatLabel>
      {!hasScoreMix(mix) ? (
        <StatValue size={compact ? "card-sm" : "card"}>—</StatValue>
      ) : compact ? (
        <ScoreMixBar mix={mix} />
      ) : (
        <ScoreMixDonut mix={mix} />
      )}
    </Card>
  );
}

interface GoalCardProps {
  /** Null until a goal is set, which asks for one. */
  goal: GoalProgress | null;
  /** The year's rounds, for the phone's line under the goal. */
  seasonRounds: number;
  compact?: boolean;
  className?: string;
}

/** The scoring goal as a ring of how far along, and whether it's on track. Opens The Lab. */
export function GoalCard({ goal, seasonRounds, compact = false, className }: GoalCardProps) {
  const target = goal ? goalTargetLabel(goal.target) : "Set a scoring goal";
  return (
    <Card
      data-slot="goal-card"
      render={<Link to="/the-lab" />}
      interactive
      className={cn("flex-row items-center gap-4", compact ? "px-4" : "px-5", className)}
    >
      <ProgressRing
        value={goal?.progressPct ?? null}
        thick={compact}
        label={goal ? `Progress to ${target.toLowerCase()}` : "No goal set"}
        className={compact ? "size-16" : "size-20"}
      />
      <div className={cn("flex min-w-0 flex-col", compact ? "flex-1 gap-0.5" : "gap-1")}>
        {!compact && <div className="text-body text-muted-foreground">Goal</div>}
        <div className={compact ? "text-subhead" : "text-xl font-semibold"}>{target}</div>
        {goal ? (
          compact ? (
            <div className="text-body text-foreground-secondary">{goalSeasonLine(goal.onTrack, seasonRounds)}</div>
          ) : (
            <div className={cn("text-body font-semibold", goal.onTrack ? "text-primary" : "text-muted-foreground")}>
              {goalStatusLabel(goal.onTrack)}
            </div>
          )
        ) : (
          <div className="text-body text-foreground-secondary">Pick a score to break in The Lab</div>
        )}
      </div>
      {compact && <ChevronRight aria-hidden className="size-icon-md text-muted-foreground" />}
    </Card>
  );
}
