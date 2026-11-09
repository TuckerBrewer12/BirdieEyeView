import type { ElementType, ReactNode } from "react";
import { CircleDot, Flag, TrendingDown, Trophy } from "lucide-react";
import { Collection, RowButton } from "@/brand";
import { cn } from "@/brand/cn";
import type { Milestone } from "../model";
import { milestoneWhere, milestoneWording } from "../present";

const ICON_MAP: Record<Milestone["kind"], ElementType> = {
  under_par: TrendingDown,
  score_break: Trophy,
  putt_break: CircleDot,
  par_streak: Flag,
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
        className="gap-1"
        // The server sends at most one milestone of each kind.
        keyFor={(m) => m.kind}
        empty="No milestones yet. Keep playing."
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-primary">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block truncate text-body-sm text-muted-foreground">{milestoneWhere(milestone)}</span>
      </span>
      <span className="shrink-0 text-lg font-semibold tabular-nums text-foreground">{figure}</span>
    </>
  );
  // The card pads its content, so the row's own padding hangs into it.
  const row = "-mx-2 flex items-center gap-3 rounded-xl px-2 py-1";

  if (!onClick) return <div className={row}>{content}</div>;
  return (
    <RowButton onClick={onClick} className={cn(row, "cursor-pointer hover:bg-muted/half")}>
      {content}
    </RowButton>
  );
}
