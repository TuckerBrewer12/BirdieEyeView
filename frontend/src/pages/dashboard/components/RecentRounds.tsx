import { Link, useNavigate } from "react-router-dom";
import { Collection, RoundPreview } from "@/brand";
import { cn } from "@/brand/cn";
import type { RoundSummary } from "@/domain";
import { SURFACE } from "./DashboardCards";

interface RecentRoundsProps {
  rounds: RoundSummary[];
  /** The phone's: the date under the course, no cells. */
  compact?: boolean;
}

/** The rounds before the last one, a row each, and the way to the rest. */
export function RecentRounds({ rounds, compact = false }: RecentRoundsProps) {
  const navigate = useNavigate();
  return (
    <section data-slot="recent-rounds" className={cn(SURFACE, compact ? "p-2" : "p-2.5")}>
      <div className={cn("flex items-center justify-between", compact ? "px-3 pt-2.5 pb-1" : "px-3.5 pt-2.5 pb-1.5")}>
        <h2 className={compact ? "text-base font-semibold" : "text-subhead"}>Recent rounds</h2>
        <Link to="/rounds" className="text-sm font-semibold text-primary hover:underline">
          See all
        </Link>
      </div>
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
    </section>
  );
}
