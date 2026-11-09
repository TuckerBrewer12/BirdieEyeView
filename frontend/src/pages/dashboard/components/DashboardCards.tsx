import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ProgressRing, ScoreMixBar, ScoreMixDonut, Sparkline, StatDelta } from "@/brand";
import { cn } from "@/brand/cn";
import { toParDisplay, toParTextClass } from "@/brand/theme";
import { formatOneDecimal, goalTargetLabel, type ScoreMix } from "@/domain";
import { hasScoreMix, type BestRound, type ChangeVerdict, type GoalProgress } from "../model";
import { bestLabel, bestWhere, goalSeasonLine, goalStatusLabel, moveOf } from "../present";

/** A card on the page, as the dashboard's figures sit: no rule, the soft surface's shadow. */
export const SURFACE = "rounded-surface bg-card text-card-foreground shadow-surface";
const LINK_SURFACE = cn(SURFACE, "transition-shadow hover:shadow-card");
const CARD_PADDING = { wide: "px-5.5 py-5", phone: "px-4.5 py-4" } as const;

/** A move the server judged: good moves read in the brand's green, as the canvas has them. */
function Delta({ change, verdict, className }: { change: number | null; verdict: ChangeVerdict | null; className?: string }) {
  const move = moveOf(change);
  return (
    <StatDelta
      direction={move.direction}
      tone={verdict ?? "neutral"}
      className={cn("font-semibold", verdict === "good" && "text-primary", className)}
    >
      {move.amount}
    </StatDelta>
  );
}

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
    <div
      data-slot="scoring-average-card"
      className={cn(SURFACE, "flex flex-col", compact ? cn(CARD_PADDING.phone, "gap-1") : cn(CARD_PADDING.wide, "gap-1.5"))}
    >
      <div className={cn("text-muted-foreground", compact ? "text-body-sm" : "text-body")}>
        {compact ? "Scoring avg" : "Scoring average"}
      </div>
      <div className={cn("flex items-baseline", compact ? "gap-1.5" : "gap-2")}>
        <span className={compact ? "text-figure-sm" : "text-figure"}>{formatOneDecimal(average)}</span>
        <Delta change={change} verdict={verdict} className={compact ? "text-body-sm" : "text-body"} />
      </div>
      {!compact && <Sparkline size="card" series={[{ values: line, tone: "primary" }]} />}
    </div>
  );
}

/** The best round: its score in its to-par's colour, and where and when. Opens the round. */
export function BestRoundCard({ best, compact = false }: { best: BestRound | null; compact?: boolean }) {
  const body = (
    <>
      <div className={cn("text-muted-foreground", compact ? "truncate text-body-sm" : "text-body")}>
        {compact ? bestLabel(best) : "Best round"}
      </div>
      <div className={cn("flex items-baseline", compact ? "gap-1.5" : "gap-2")}>
        <span className={cn(compact ? "text-figure-sm" : "text-figure", best ? toParTextClass(best.toPar) : "text-foreground")}>
          {best?.score ?? "—"}
        </span>
        {best && !compact && (
          <span className={cn("text-body font-semibold", toParTextClass(best.toPar))}>{toParDisplay(best.toPar, "")}</span>
        )}
        {best?.roundId && compact && (
          <span aria-hidden className="text-body-sm font-semibold text-primary">
            →
          </span>
        )}
      </div>
      {best && !compact && <div className="text-body font-semibold text-primary">{bestWhere(best)} →</div>}
    </>
  );
  const layout = cn("flex flex-col", compact ? cn(CARD_PADDING.phone, "gap-1") : cn(CARD_PADDING.wide, "gap-1.5"));
  return best?.roundId ? (
    <Link to={`/rounds/${best.roundId}`} data-slot="best-round-card" className={cn(LINK_SURFACE, layout)}>
      {body}
    </Link>
  ) : (
    <div data-slot="best-round-card" className={cn(SURFACE, layout)}>
      {body}
    </div>
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
    <div
      data-slot="score-mix-card"
      className={cn(SURFACE, "flex flex-col", compact ? cn(CARD_PADDING.phone, "gap-2.5") : cn(CARD_PADDING.wide, "gap-3"), className)}
    >
      <div className={cn("text-muted-foreground", compact ? "text-body-sm" : "text-body")}>Score mix · last 5</div>
      {!hasScoreMix(mix) ? (
        <div className={compact ? "text-figure-sm" : "text-figure"}>—</div>
      ) : compact ? (
        <ScoreMixBar mix={mix} />
      ) : (
        <ScoreMixDonut mix={mix} />
      )}
    </div>
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
    <Link
      to="/the-lab"
      data-slot="goal-card"
      className={cn(
        LINK_SURFACE,
        "flex items-center",
        compact ? cn(CARD_PADDING.phone, "gap-4") : "gap-4.5 px-5.5 py-4.5",
        className,
      )}
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
      {compact && <ChevronRight aria-hidden className="size-4.5 text-muted-foreground" />}
    </Link>
  );
}
