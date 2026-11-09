import { ChevronRight } from "lucide-react";
import { Card, RowButton, Sparkline, StatDelta } from "@/brand";
import { formatOneDecimal } from "@/domain";
import type { ChangeVerdict } from "../model";
import { bestLabel, moveOf } from "../present";

interface ScoringHeroCardProps {
  average: number | null;
  /** How far the average moved, and the server's verdict on it. */
  change: number | null;
  changeVerdict: ChangeVerdict | null;
  /** Each round's five-round average across the window, oldest first. */
  line: (number | null)[];
  bestRound: number | null;
  bestCourse: string | null;
  totalRounds: number;
  /** Opens the best round. None without one to open. */
  onBestClick?: () => void;
}

const LINE_TONE = { good: "good", bad: "bad", neutral: "muted" } as const;

/** The phone's lead card: the scoring average and its line, then the best round and the count. */
export function ScoringHeroCard({
  average,
  change,
  changeVerdict,
  line,
  bestRound,
  bestCourse,
  totalRounds,
  onBestClick,
}: ScoringHeroCardProps) {
  const move = moveOf(change);
  const tone = changeVerdict ?? "neutral";
  const best = (
    <>
      <span className="flex items-center gap-1 text-lg font-semibold text-foreground">
        {bestRound ?? "—"}
        {onBestClick && <ChevronRight aria-hidden className="size-3 text-primary" />}
      </span>
      <span className="mt-0.5 text-label font-semibold text-primary">{bestLabel(bestCourse)}</span>
    </>
  );

  return (
    <Card data-slot="scoring-hero-card" className="gap-3.5 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-body-sm font-medium text-foreground-secondary">Scoring avg</div>
          <div className="flex items-baseline gap-2">
            <span className="text-hero font-semibold text-foreground">{formatOneDecimal(average)}</span>
            <StatDelta direction={move.direction} tone={tone} className="text-body font-semibold">
              {move.amount}
            </StatDelta>
          </div>
        </div>
        <Sparkline size="hero" className="w-30" series={[{ values: line, tone: LINE_TONE[tone] }]} />
      </div>
      <div className="grid grid-cols-2 border-t border-chart-grid pt-3">
        {onBestClick ? (
          <RowButton
            aria-label={`Best round: ${bestRound ?? "none"}. Open round`}
            onClick={onBestClick}
            className="flex cursor-pointer flex-col items-center py-0.5"
          >
            {best}
          </RowButton>
        ) : (
          <div className="flex flex-col items-center py-0.5">{best}</div>
        )}
        <div className="flex flex-col items-center border-l border-chart-grid py-0.5">
          <span className="text-lg font-semibold text-foreground">{totalRounds}</span>
          <span className="mt-0.5 text-label text-muted-foreground">Rounds played</span>
        </div>
      </div>
    </Card>
  );
}
