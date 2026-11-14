import { Link, useNavigate } from "react-router-dom";
import { Card, CardAction, CardHeader, CardTitle, Collection, RoundPreview } from "@/brand";
import { cn } from "@/brand/cn";
import type { RoundSummary } from "@/domain";

interface RecentRoundsProps {
  rounds: RoundSummary[];
  compact?: boolean;
}

export function RecentRounds({ rounds, compact = false }: RecentRoundsProps) {
  const navigate = useNavigate();
  return (
    <Card data-slot="recent-rounds" render={<section />} className={cn("gap-0", compact ? "p-2" : "p-2.5")}>
      <CardHeader className={cn("items-center", compact ? "px-3 pt-2.5 pb-1" : "px-3.5 pt-2.5 pb-1.5")}>
        <CardTitle level={2} className={compact ? "font-semibold" : "text-subhead"}>
          Recent rounds
        </CardTitle>
        <CardAction className="self-center">
          <Link to="/rounds" className="text-sm font-semibold text-primary hover:underline">
            See all
          </Link>
        </CardAction>
      </CardHeader>
      <Collection
        items={rounds}
        className="gap-0"
        keyFor={(round) => round.id}
        empty="No other rounds yet"
        renderItem={(round) => (
          <RoundPreview
            variant="compact"
            layout={compact ? "stacked" : "inline"}
            round={round}
            onClick={() => void navigate(`/rounds/${round.id}`)}
          />
        )}
      />
    </Card>
  );
}
