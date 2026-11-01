import { Button, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, Meter, Stat, StatLabel, StatUnit, StatValue } from "@/brand";
import { TOUR_SHORT_GAME } from "@/domain";
import { pctLabel } from "../present";

interface ShortGameCardProps {
  /** Over the last five rounds; null when there was nothing to measure. */
  scramblingPct: number | null;
  upAndDownPct: number | null;
  onOpenLab: () => void;
}

/** Scrambling and up-and-down over the last five rounds, each against the tour's rate. */
export function ShortGameCard({ scramblingPct, upAndDownPct, onOpenLab }: ShortGameCardProps) {
  const rates = [
    { label: "Scrambling", value: scramblingPct, tour: TOUR_SHORT_GAME.scrambling },
    { label: "Up & Down", value: upAndDownPct, tour: TOUR_SHORT_GAME.upAndDown },
  ];

  return (
    <Card data-slot="short-game-card">
      <CardHeader>
        <CardTitle>Short Game</CardTitle>
        <CardDescription>Last 5 rounds</CardDescription>
        <CardAction>
          <Button variant="link" size="sm" onClick={onOpenLab}>
            Open Lab →
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {rates.map(({ label, value, tour }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <Stat>
              <StatLabel>{label}</StatLabel>
              <StatValue size="md">
                {value != null ? value.toFixed(0) : "—"}
                {value != null && <StatUnit>%</StatUnit>}
              </StatValue>
            </Stat>
            <Meter value={value} marker={tour} size="sm" aria-label={`${label} against the tour's ${tour}%`} />
            <div className="flex justify-between text-caption text-muted-foreground">
              <span>You {pctLabel(value)}</span>
              <span>Tour {tour}%</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
