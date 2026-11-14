import type { ReactNode } from "react";
import { cn } from "@/brand/cn";
import { Card } from "@/brand/components/Card";
import { useFromBreakpoint } from "@/brand/useFromBreakpoint";

interface ScorecardCardProps {
  bar?: ReactNode;
  action?: ReactNode;
  children: (nine?: "front" | "back") => ReactNode;
  className?: string;
  "data-slot"?: string;
}

function ScorecardCard({ bar, action, children, className, "data-slot": slot = "scorecard-card" }: ScorecardCardProps) {
  const wide = useFromBreakpoint("md");

  return (
    <Card data-slot={slot} className={cn("gap-0 py-0", className)}>
      {(bar != null || action != null) && (
        <div className="flex min-h-10 items-center justify-between gap-4 bg-primary px-3.5 py-2.5 text-label font-semibold text-primary-foreground md:min-h-11 md:px-5 md:text-body-sm dark:bg-accent dark:text-foreground">
          <span className="min-w-0 truncate">{bar}</span>
          {action}
        </div>
      )}
      {wide ? (
        <div className="overflow-x-auto">
          <div className="min-w-scorecard-round px-3 pt-1 pb-2.5">{children()}</div>
        </div>
      ) : (
        <div className="pb-1">
          {children("front")}
          <div aria-hidden className="h-1.5 bg-background" />
          {children("back")}
        </div>
      )}
    </Card>
  );
}

export { ScorecardCard };
