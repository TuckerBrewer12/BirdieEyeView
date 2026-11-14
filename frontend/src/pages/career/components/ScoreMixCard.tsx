import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyNote, ScoreMixBar } from "@/brand";
import type { ScoreMix } from "@/domain";
import { pluralize } from "@/domain/format";

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
        <CardDescription>{pluralize(holesPlayed, "hole")}</CardDescription>
      </CardHeader>
      <CardContent>
        {holesPlayed > 0 ? (
          <ScoreMixBar mix={mix} />
        ) : (
          <EmptyNote className="py-4">No holes scored yet</EmptyNote>
        )}
      </CardContent>
    </Card>
  );
}
