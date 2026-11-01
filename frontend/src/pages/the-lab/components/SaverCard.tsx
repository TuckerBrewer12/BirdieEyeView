import { Crosshair, Flame, Home, Ruler, Shuffle, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { Card, CardContent, Meter, Stat, StatUnit, StatValue } from "@/brand";
import type { Saver } from "../model";
import { SAVER_LABEL } from "../present";

const SAVER_ICON: Record<Saver["kind"], LucideIcon> = {
  three_putt_bleed: Target,
  blowup_holes: Flame,
  achilles_heel: Ruler,
  home_course_demon: Home,
  gir_opportunity: Crosshair,
  scrambling_opportunity: Shuffle,
  par5_opportunity: TrendingUp,
};

/**
 * One place to find strokes: what it is worth a round, the server's headline and detail,
 * and how much of the gap to the goal it would close.
 */
export function SaverCard({ saver }: { saver: Saver }) {
  const Icon = SAVER_ICON[saver.kind];
  const share = Math.min(100, saver.shareOfGap);

  return (
    <Card data-slot="saver-card" size="sm">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-primary">
              <Icon aria-hidden className="size-icon-xs" />
            </span>
            <span className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
              {SAVER_LABEL[saver.kind]}
            </span>
          </div>
          <Stat align="end">
            <StatValue size="sm" className="text-primary">
              −{saver.strokesSaved.toFixed(1)}
              <StatUnit>strokes</StatUnit>
            </StatValue>
          </Stat>
        </div>
        <p className="text-sm font-semibold text-card-foreground">{saver.headline}</p>
        <p className="text-label text-muted-foreground">{saver.detail}</p>
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex justify-between text-caption text-muted-foreground">
            <span>Share of your gap</span>
            <span className="font-bold text-secondary-foreground">{share.toFixed(0)}%</span>
          </div>
          <Meter value={share} size="sm" aria-label={`${SAVER_LABEL[saver.kind]}: share of your gap`} />
        </div>
      </CardContent>
    </Card>
  );
}
