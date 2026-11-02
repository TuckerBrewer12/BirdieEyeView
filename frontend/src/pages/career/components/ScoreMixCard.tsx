import { Card, CardContent, CardDescription, CardHeader, CardTitle, ScoreMixBar } from "@/brand";
import type { ScoreMix } from "@/domain";
import { holesLabel } from "../present";

interface ScoreMixCardProps {
  mix: ScoreMix;
  holesPlayed: number;
  className?: string;
}

/** How every hole the golfer has played split across score kinds. */
export function ScoreMixCard({ mix, holesPlayed, className }: ScoreMixCardProps) {
  return (
    <Card data-slot="score-mix-card" className={className}>
      <CardHeader>
        <CardTitle>Career Score Mix</CardTitle>
        <CardDescription>{holesLabel(holesPlayed)}</CardDescription>
      </CardHeader>
      <CardContent>
        {holesPlayed > 0 ? (
          <ScoreMixBar mix={mix} />
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">No holes scored yet</p>
        )}
      </CardContent>
    </Card>
  );
}
