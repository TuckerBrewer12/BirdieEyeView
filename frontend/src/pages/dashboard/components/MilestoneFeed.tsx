import type { ElementType } from "react";
import {
  ChevronRight,
  CircleDot,
  Star,
  Target,
  Trophy,
  TrendingDown,
  Zap,
} from "lucide-react";
import type { Milestone } from "@/types/golf";
import { Collection } from "@/brand";

const ICON_MAP: Record<Milestone["type"], ElementType> = {
  score_break: Trophy,
  gir_break: Target,
  putt_break: CircleDot,
  eagle: Star,
  hole_in_one: Zap,
  under_par: TrendingDown,
  par_streak: Trophy,
  birdie_streak: Star,
};

const COLOR_MAP: Record<Milestone["type"], string> = {
  score_break: "bg-score-eagle/15 text-score-eagle",
  gir_break: "bg-score-birdie/15 text-score-birdie",
  putt_break: "bg-score-double/15 text-score-double",
  eagle: "bg-score-triple/15 text-score-triple",
  hole_in_one: "bg-destructive/10 text-destructive",
  under_par: "bg-primary/10 text-primary",
  par_streak: "bg-score-quad/15 text-score-quad",
  birdie_streak: "bg-score-birdie/15 text-score-birdie",
};

interface MilestoneFeedProps {
  milestones: Milestone[];
  onRoundClick?: (roundId: string) => void;
}

export function MilestoneFeed({ milestones, onRoundClick }: MilestoneFeedProps) {
  return (
    <div data-slot="milestone-feed">
      <Collection
        items={milestones}
        keyFor={(m, i) => m.round_id ?? `${m.type}-${m.date}-${i}`}
        empty="No milestones yet — keep playing!"
        renderItem={(m) => {
          const Icon = ICON_MAP[m.type];
          return (
            <div className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/80">
              <div className={`shrink-0 rounded-lg p-2 ${COLOR_MAP[m.type]}`}>
                <Icon className="size-icon-xs" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-tight text-card-foreground">
                  {m.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.course}</p>
              </div>
              {m.round_id && onRoundClick && (
                <button
                  type="button"
                  aria-label={`Open round for ${m.label}`}
                  onClick={() => onRoundClick(m.round_id!)}
                  className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                >
                  <ChevronRight className="size-icon-xs" />
                </button>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
