import { Card, CardContent, CardDescription, CardHeader, CardTitle, ToggleGroup, ToggleGroupItem } from "@/brand";
import { RANGE_PARS, type RangePar, type YardageBucket } from "../model";
import { YardageBucketCard } from "./YardageBucketCard";

interface RangeViewCardProps {
  buckets: YardageBucket[];
  par: RangePar;
  onParChange: (par: RangePar) => void;
  className?: string;
}

/** How the golfer scores from each yardage band, one par type at a time. */
export function RangeViewCard({ buckets, par, onParChange, className }: RangeViewCardProps) {
  const shown = buckets.filter((bucket) => bucket.par === par);
  const played = new Set(buckets.map((bucket) => bucket.par));

  return (
    <Card data-slot="range-view-card" className={className}>
      <CardHeader>
        <CardTitle>Range View</CardTitle>
        <CardDescription>Performance by yardage and par</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          aria-label="Par type"
          variant="outline"
          size="sm"
          spacing={0}
          value={[String(par)]}
          onValueChange={(values) => {
            const next = RANGE_PARS.find((option) => String(option) === values[0]);
            if (next) onParChange(next);
          }}
        >
          {RANGE_PARS.map((option) => (
            <ToggleGroupItem key={option} value={String(option)} disabled={!played.has(option)}>
              Par {option}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {shown.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((bucket) => (
              <YardageBucketCard key={bucket.label} bucket={bucket} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">No Par {par} yardage data recorded</p>
        )}
      </CardContent>
    </Card>
  );
}
