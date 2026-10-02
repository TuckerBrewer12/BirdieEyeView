import type { ElementType, ReactNode } from "react";
import { CircleDot, Flag, TrendingDown, Trophy } from "lucide-react";
import { Collection } from "@/brand";
import { cn } from "@/brand/cn";
import type { Milestone } from "../model";
import { milestoneWording } from "../present";

const ICON_MAP: Record<Milestone["kind"], ElementType> = {
  under_par: TrendingDown,
  score_break: Trophy,
  putt_break: CircleDot,
  par_streak: Flag,
};

const COLOR_MAP: Record<Milestone["kind"], string> = {
  under_par: "bg-primary/10 text-primary",
  score_break: "bg-score-eagle/15 text-score-eagle",
  putt_break: "bg-score-double/15 text-score-double",
  par_streak: "bg-score-quad/15 text-score-quad",
};

interface MilestoneFeedProps {
  milestones: Milestone[];
  onRoundClick?: (roundId: string) => void;
}

/** Lifetime bests, newest first. A milestone set in a saved round opens it. */
export function MilestoneFeed({ milestones, onRoundClick }: MilestoneFeedProps) {
  return (
    <div data-slot="milestone-feed">
      <Collection
        items={milestones}
        // The server sends at most one milestone of each kind.
        keyFor={(m) => m.kind}
        empty="No milestones yet — keep playing!"
        renderItem={(m) => {
          const roundId = m.roundId;
          return (
            <MilestoneRow
              milestone={m}
              onClick={roundId && onRoundClick ? () => onRoundClick(roundId) : undefined}
            />
          );
        }}
      />
    </div>
  );
}

function MilestoneRow({ milestone, onClick }: { milestone: Milestone; onClick?: () => void }) {
  const Icon = ICON_MAP[milestone.kind];
  const { title, figure } = milestoneWording(milestone);
  const content: ReactNode = (
    <>
      <div className={cn("shrink-0 rounded-lg p-2", COLOR_MAP[milestone.kind])}>
        <Icon className="size-icon-xs" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-card-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{milestone.course}</p>
      </div>
      <span className="shrink-0 text-lg font-bold tracking-stat tabular-nums text-card-foreground">
        {figure}
      </span>
    </>
  );
  // The card already pads its content, so the row's own padding hangs into it.
  const row = "-mx-2 flex items-center gap-2.5 rounded-xl p-2 text-left";

  if (!onClick) return <div className={row}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(row, "cursor-pointer transition-colors hover:bg-muted/80")}
    >
      {content}
    </button>
  );
}
