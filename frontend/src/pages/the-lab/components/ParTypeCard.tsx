import { Card, CardContent, CardDescription, CardHeader, CardTitle, Meter, toParTextClass } from "@/brand";
import { cn } from "@/brand/cn";
import { formatAverageToPar } from "@/domain";
import type { ParTypeRow } from "../model";
import { parTypeGapNote } from "../present";

/** A par type's bar is full at this many strokes over par a hole. */
const BAR_FULL_AT = 2.4;

const toBar = (averageToPar: number) => (Math.max(0, averageToPar) / BAR_FULL_AT) * 100;

interface ParTypeCardProps {
  rows: ParTypeRow[];
  /** What the marker on each bar is: "Breaks 80", a friend's name. Null with no comparison. */
  benchmarkName: string | null;
  className?: string;
}

/** Strokes over par a hole on par 3s, 4s and 5s, each marked against the comparison. */
export function ParTypeCard({ rows, benchmarkName, className }: ParTypeCardProps) {
  return (
    <Card data-slot="par-type-card" className={className}>
      <CardHeader>
        <CardTitle>Scoring by Par Type</CardTitle>
        <CardDescription>
          Average to par a hole · last 20 rounds
          {benchmarkName && ` · tick is ${benchmarkName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => {
          const label = `Par ${row.par}s`;
          if (row.averageToPar == null) {
            return (
              <div key={row.par} className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-card-foreground">{label}</span>
                <span className="text-sm text-muted-foreground">No data</span>
              </div>
            );
          }
          const comparison =
            row.benchmarkToPar != null && benchmarkName != null
              ? parTypeGapNote(row.averageToPar, row.benchmarkToPar, benchmarkName)
              : null;
          return (
            <div key={row.par} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-card-foreground">{label}</span>
                <span className="font-mono text-sm font-bold text-card-foreground">
                  {formatAverageToPar(row.averageToPar)} avg
                </span>
              </div>
              <Meter
                value={toBar(row.averageToPar)}
                marker={row.benchmarkToPar != null ? toBar(row.benchmarkToPar) : null}
                aria-label={`${label}: ${formatAverageToPar(row.averageToPar)} a hole`}
              />
              {comparison && (
                <p className={cn("text-label", toParTextClass(comparison.gap))}>{comparison.text}</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
