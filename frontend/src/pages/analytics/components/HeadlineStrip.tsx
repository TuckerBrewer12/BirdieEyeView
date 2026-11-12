import { Card, Sparkline, StatDelta, StatLabel, StatValue } from "@/brand";
import { cn } from "@/brand/cn";
import type { HeadlineFigure } from "../model";
import { headlineTiles, onPhone } from "../present";

interface HeadlineStripProps {
  figures: HeadlineFigure[];
  className?: string;
}

const SPARK_TONE = { good: "good", bad: "bad", neutral: "primary" } as const;

/**
 * The page's five headline figures in one card, divided: each with how the last five rounds moved
 * it and its five-round line. Two across on a phone, which leaves scrambling to Ball striking.
 */
export function HeadlineStrip({ figures, className }: HeadlineStripProps) {
  const tiles = headlineTiles(figures);
  return (
    <Card
      data-slot="headline-strip"
      // The tiles sit a hairline apart on the border's colour, so the rules between them follow
      // the grid whichever tiles show.
      className={cn("grid grid-cols-2 gap-px bg-border py-0 md:grid-cols-5", className)}
    >
      {tiles.map((tile) => (
        <div
          key={tile.metric}
          data-slot="headline-tile"
          className={cn(
            "flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3.5 md:p-4",
            !onPhone(tile) && "max-md:hidden",
          )}
        >
          <StatLabel>{tile.label}</StatLabel>
          <div className="flex items-baseline gap-2">
            <StatValue size="lg">{tile.value}</StatValue>
            {tile.change && (
              <StatDelta direction={tile.direction} tone={tile.tone}>
                {tile.change}
              </StatDelta>
            )}
          </div>
          {tile.trend.length > 1 && (
            <Sparkline size="compact" className="w-full" series={[{ values: tile.trend, tone: SPARK_TONE[tile.tone] }]} />
          )}
        </div>
      ))}
    </Card>
  );
}
