import { Card, Meter } from "@/brand";
import { TOUR_SHORT_GAME, formatPercent } from "@/domain";

interface ShortGameCardProps {
  /** Over the picked window; null when there was nothing to measure. */
  scramblingPct: number | null;
  upAndDownPct: number | null;
}

/** Scrambling and up-and-down, each against the tour's rate marked on its bar. */
export function ShortGameCard({ scramblingPct, upAndDownPct }: ShortGameCardProps) {
  const rates = [
    { label: "Scrambling", value: scramblingPct, tour: TOUR_SHORT_GAME.scrambling },
    { label: "Up & down", value: upAndDownPct, tour: TOUR_SHORT_GAME.upAndDown },
  ];

  return (
    <Card data-slot="short-game-card" className="grid grid-cols-2 gap-4 px-4 py-3.5">
      {rates.map(({ label, value, tour }) => (
        <div key={label} className="flex flex-col gap-2">
          <div className="text-body-sm font-medium text-foreground-secondary">{label}</div>
          <div className="text-2xl font-semibold tracking-title text-foreground">{formatPercent(value)}</div>
          <Meter
            value={value}
            marker={tour}
            size="sm"
            aria-label={`${label} against the tour's ${formatPercent(tour)}`}
          />
          <div className="text-label text-muted-foreground">Tour {formatPercent(tour)}</div>
        </div>
      ))}
    </Card>
  );
}
