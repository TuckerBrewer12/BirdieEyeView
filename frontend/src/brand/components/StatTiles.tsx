import { Card, CardContent } from "@/brand/components/Card";
import { Stat, StatLabel, StatValue } from "@/brand/components/Stat";
import { cn } from "@/brand/cn";

interface StatTile {
  label: string;
  /** Formatted by the screen: "7.0", "82.9", "—". */
  value: string;
  /** A quieter line under the figure, like the course the best round was at. */
  detail?: string | null;
}

interface StatTilesProps {
  tiles: readonly StatTile[];
  className?: string;
}

// Narrow, the tiles sit three to a row of six columns; whatever the last row
// would leave short widens to halves, so no tile sits alone.
const NARROW_SPAN = [
  "@max-2xl:col-span-2",
  "@max-2xl:col-span-2 @max-2xl:nth-last-[-n+4]:col-span-3",
  "@max-2xl:col-span-2 @max-2xl:nth-last-[-n+2]:col-span-3",
] as const;

/** A row of headline figures, one card each: in one row when there is room, else in rows of three. */
function StatTiles({ tiles, className }: StatTilesProps) {
  const span = NARROW_SPAN[tiles.length % 3];
  return (
    <div data-slot="stat-tiles" className={cn("@container", className)}>
      <div className="grid grid-cols-6 gap-3 @2xl:grid-flow-col @2xl:grid-cols-none @2xl:auto-cols-fr @2xl:gap-4">
        {tiles.map((tile) => (
          <Card key={tile.label} size="sm" className={span}>
            <CardContent>
              <Stat align="center">
                <StatLabel>{tile.label}</StatLabel>
                <StatValue size="lg">{tile.value}</StatValue>
                {tile.detail && <div className="max-w-full truncate text-xs text-muted-foreground">{tile.detail}</div>}
              </Stat>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export { StatTiles };
export type { StatTile, StatTilesProps };
