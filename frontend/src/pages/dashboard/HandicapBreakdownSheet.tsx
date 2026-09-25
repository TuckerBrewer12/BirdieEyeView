import { CheckCircle, Circle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/brand";
import { formatHandicapIndex } from "@/domain/handicap";
import type { WhsBreakdown } from "@/domain";
import {
  adjustmentLabel,
  courseLabelForWhs,
  differentialLabel,
  ratingLabelForWhs,
  usedLegend,
  whsContextNote,
} from "./present";

interface HandicapBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  handicapIndex: number | null | undefined;
  whs: WhsBreakdown;
}

export function HandicapBreakdownSheet({
  open,
  onClose,
  handicapIndex,
  whs,
}: HandicapBreakdownSheetProps) {
  const handicapIndexLabel = formatHandicapIndex(handicapIndex);
  const {
    rows,
    windowSize,
    countUsed,
    adjustment,
    diffAvg,
    hasRatedRounds,
    showCalculation,
  } = whs;
  const adjustmentText = adjustmentLabel(adjustment);
  const diffAvgLabel = diffAvg != null ? diffAvg.toFixed(2) : null;
  const legend = usedLegend(countUsed, rows.filter((r) => r.used).length);
  const contextNote = whsContextNote(countUsed);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Handicap Index</SheetTitle>
          <SheetDescription>
            {handicapIndexLabel} HCP
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          <div>
            <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-3">
              WHS Formula
            </div>
            <div className="bg-muted rounded-card p-4">
              <div className="text-sm font-semibold text-secondary-foreground mb-1">Score Differential</div>
              <div className="font-mono text-xs text-muted-foreground leading-relaxed">
                = (Score − Course Rating) × 113 ÷ Slope Rating
              </div>
              {!hasRatedRounds && (
                <Alert className="mt-2">
                  <AlertDescription>
                    Your rounds don't have slope/rating data — using score-to-par as differential
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {showCalculation && (
            <div>
              <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-3">
                Current Calculation
              </div>
              <div className="bg-accent rounded-card p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rounds in window</span>
                  <span className="font-semibold text-card-foreground">{windowSize} of 20</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Best differentials used</span>
                  <span className="font-semibold text-card-foreground">{countUsed}</span>
                </div>
                {diffAvgLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Their average</span>
                    <span className="font-semibold text-card-foreground font-mono">{diffAvgLabel}</span>
                  </div>
                )}
                {adjustmentText && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">WHS adjustment</span>
                    <span className="font-semibold text-card-foreground font-mono">{adjustmentText}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="text-sm font-bold text-primary">Handicap Index</span>
                  <span className="text-sm font-black text-primary font-mono">
                    {handicapIndexLabel}
                  </span>
                </div>
              </div>

              {adjustment !== 0 && (
                <div className="mt-2 px-1 text-label text-muted-foreground leading-relaxed">
                  With only {windowSize} rounds, WHS applies a {adjustment} adjustment to encourage more play before the index fully stabilizes.
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-3">
              Recent Rounds · Last {rows.length}
            </div>

            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No rounds yet</div>
            ) : (
              <div className="rounded-card border border-border overflow-hidden divide-y divide-border">
                <div className="grid grid-cols-handicap-breakdown gap-2 px-4 py-2 bg-muted text-meta font-bold uppercase tracking-kicker text-muted-foreground">
                  <span>Course</span>
                  <span className="text-right w-10">Score</span>
                  <span className="text-right w-16">Diff</span>
                  <span className="w-5" />
                </div>

                {rows.map((row) => (
                  <div
                    key={row.roundIndex}
                    className={`grid grid-cols-handicap-breakdown gap-2 px-4 py-3 items-center ${
                      row.used ? "bg-accent" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-card-foreground truncate">
                        {courseLabelForWhs(row)}
                      </div>
                      {ratingLabelForWhs(row) && (
                        <div className="text-meta text-muted-foreground font-mono mt-0.5">
                          {ratingLabelForWhs(row)}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-mono font-semibold text-secondary-foreground text-right w-10">
                      {row.score != null ? String(row.score) : "—"}
                    </div>
                    <div className={`text-sm font-mono font-bold text-right w-16 ${
                      row.differential == null
                        ? "text-muted-foreground"
                        : row.used
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}>
                      {differentialLabel(row.differential)}
                    </div>
                    <div className="w-5 flex justify-center">
                      {row.used ? (
                        <CheckCircle className="size-3.5 text-primary shrink-0" />
                      ) : row.differential != null ? (
                        <Circle className="size-3.5 text-muted-foreground shrink-0" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {legend && (
              <div className="mt-3 flex items-center gap-2 text-label text-muted-foreground px-1">
                <CheckCircle className="size-3 text-primary shrink-0" />
                <span>{legend}</span>
              </div>
            )}
          </div>

          <div className="text-label text-muted-foreground leading-relaxed pb-4 px-1">
            {contextNote}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
