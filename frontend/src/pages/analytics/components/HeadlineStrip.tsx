import { Card, StatTile } from "@/brand";
import { cn } from "@/brand/cn";
import type { HeadlineFigure } from "../model";
import { headlineTiles, onPhone } from "../present";

interface HeadlineStripProps {
  figures: HeadlineFigure[];
  className?: string;
}

export function HeadlineStrip({ figures, className }: HeadlineStripProps) {
  const tiles = headlineTiles(figures);
  return (
    <Card
      data-slot="headline-strip"
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
