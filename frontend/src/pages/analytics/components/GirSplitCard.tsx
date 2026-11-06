import { Card, CardContent, CardDescription, CardHeader, CardTitle, ScoreMixBar } from "@/brand";
import { cn } from "@/brand/cn";
import { pluralize } from "@/domain";
import type { GirSplit } from "../model";
import { GIR_SPLIT_LABEL } from "../present";

interface GirSplitCardProps {
  split: GirSplit[];
  className?: string;
}

export function GirSplitCard({ split, className }: GirSplitCardProps) {
  return (
    <Card data-slot="gir-split-card" className={className}>
      <CardHeader>
        <CardTitle>GIR vs No-GIR</CardTitle>
        <CardDescription>How holes go when you hit the green, and when you miss it</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {split.map((bucket) => (
          <div key={bucket.bucket} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={cn("text-sm font-bold", bucket.bucket === "GIR" ? "text-score-birdie" : "text-score-bogey")}
              >
                {GIR_SPLIT_LABEL[bucket.bucket]}
              </span>
              <span className="text-xs text-muted-foreground">{pluralize(bucket.holes, "hole")}</span>
            </div>
            <ScoreMixBar mix={bucket.mix} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
