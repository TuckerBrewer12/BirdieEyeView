import { CircleDot, Flag, TrendingDown, Target, Ruler, Home, Shovel } from "lucide-react";
import type { ComponentType } from "react";
import { Card, CardTitle, Meter } from "@/brand";
import { cn } from "@/brand/cn";
import type { GoalStanding, Saver } from "../profileModel";
import { saverStrokes, saversGoalNote, saversHeading } from "../profilePresent";

/** Each kind of saver's mark. */
const SAVER_ICON: Record<Saver["kind"], ComponentType<{ className?: string }>> = {
  three_putt_bleed: Flag,
  blowup_holes: TrendingDown,
  achilles_heel: Ruler,
  home_course_demon: Home,
  gir_opportunity: Target,
  scrambling_opportunity: Shovel,
  par5_opportunity: CircleDot,
};

/**
 * Where the golfer can find the strokes between their average and their goal, biggest first, as
 * the server ranked them: three across, or a list on a phone.
 */
export function SaversCard({ goal, id }: { goal: GoalStanding; id: string }) {
  const heading = saversHeading(goal);
  const savers = goal.savers.slice(0, 3);
  if (!heading || savers.length === 0) return null;
  return (
    <section id={id} data-slot="savers" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <CardTitle level={2} className="text-subhead font-bold">
          {heading}
        </CardTitle>
        <span className="hidden text-body text-muted-foreground md:inline">{saversGoalNote(goal.target)}</span>
      </div>
      <Card className="grid grid-cols-1 gap-px bg-border py-0 md:grid-cols-3">
        {savers.map((saver) => {
          const Icon = SAVER_ICON[saver.kind];
          return (
            <div key={saver.kind} data-slot="saver" className="flex flex-col gap-2.5 bg-card px-4 py-3.5 md:px-5 md:py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary text-primary">
                  <Icon className="size-4" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-lg font-semibold">{saver.headline}</span>
                  <span className="text-body-sm text-muted-foreground md:hidden">{saver.detail}</span>
                </div>
                <b className="text-title whitespace-nowrap text-primary">{saverStrokes(saver)}</b>
              </div>
              <span className={cn("hidden text-body text-muted-foreground md:block")}>{saver.detail}</span>
              <Meter
                className="hidden md:block"
                size="sm"
                value={saver.shareOfGap}
                aria-label={`${saver.headline}: ${saver.shareOfGap}% of the gap`}
              />
            </div>
          );
        })}
      </Card>
    </section>
  );
}
