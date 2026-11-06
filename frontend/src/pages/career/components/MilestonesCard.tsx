import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Collection, RowButton } from "@/brand";
import { cn } from "@/brand/cn";
import type { Milestone } from "../model";
import { milestoneKey, milestoneLabel } from "../present";

interface MilestonesCardProps {
  title: string;
  milestones: Milestone[];
  /** A line under the title, like how many records fell this year. */
  note?: string | null;
  /** Shown when there are no milestones to list. */
  empty?: string;
  /** Opens the round a milestone was reached in. */
  onOpenRound: (roundId: string) => void;
  /** Sits above the list: the phone's milestone tabs. */
  controls?: ReactNode;
  className?: string;
}

const ROW = "flex w-full items-center gap-3 py-1.5 text-left";

/** Milestones reached and still to reach. A reached one opens the round it fell in. */
export function MilestonesCard({
  title,
  milestones,
  note,
  empty,
  onOpenRound,
  controls,
  className,
}: MilestonesCardProps) {
  return (
    <Card data-slot="milestones-card" className={cn("@container", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {note && <CardDescription>{note}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {controls}
        <Collection
          className="grid grid-cols-1 gap-x-6 @md:grid-cols-2"
          items={milestones}
          keyFor={milestoneKey}
          empty={empty}
          renderItem={(milestone) => {
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full", milestone.achieved ? "bg-primary" : "bg-border")}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    milestone.achieved ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {milestoneLabel(milestone)}
                </span>
                {milestone.achieved && (
                  <>
                    <Check aria-hidden className="size-4 shrink-0 text-primary" />
                    <span className="sr-only">Achieved</span>
                  </>
                )}
              </>
            );
            const roundId = milestone.achieved ? milestone.roundId : null;
            return roundId ? (
              <RowButton
                data-slot="milestone-row"
                data-achieved="true"
                className={cn(ROW, "rounded-md hover:bg-muted/strong focus-visible:outline-2 focus-visible:outline-ring")}
                onClick={() => onOpenRound(roundId)}
              >
                {body}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </RowButton>
            ) : (
              <div data-slot="milestone-row" data-achieved={String(milestone.achieved)} className={ROW}>
                {body}
                <span aria-hidden className="size-4 shrink-0" />
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
