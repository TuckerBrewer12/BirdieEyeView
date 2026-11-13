import { Card, StatTile } from "@/brand";
import { cn } from "@/brand/cn";
import type { HeadlineFigure } from "../model";
import { headlineTiles, onPhone } from "../present";

interface HeadlineStripProps {
  figures: HeadlineFigure[];
  className?: string;
}

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
      {tiles.map(({ metric, ...tile }) => (
        <StatTile
          {...tile}
          key={metric}
          layout="strip"
          data-slot="headline-tile"
          className={cn("bg-card px-4 py-3.5 md:p-4", !onPhone(metric) && "max-md:hidden")}
        />
      ))}
    </Card>
  );
}
