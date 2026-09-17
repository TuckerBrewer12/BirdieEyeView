import { CheckCircle, Circle } from "lucide-react";
import type { DualTrendPoint } from "./useDashboardPageViewModel";
import type { ScoreDifferentialRow, ScoreTrendRow } from "@/types/analytics";
import { formatCourseName } from "@/lib/courseName";
import { formatHandicapIndex, whsWindow } from "@/domain/handicap";
import {
  Alert,
  AlertDescription,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/brand";

interface Row {
  round_index: number;
  course_name: string | null;
  score: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  differential: number | null;
  used_in_hi: boolean | null;
}

interface HandicapBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  handicapIndex: number | null;
  dualData: DualTrendPoint[];
  scoreDifferentials: ScoreDifferentialRow[];
  scoreTrend: ScoreTrendRow[];
}

export function HandicapBreakdownSheet({
  open,
  onClose,
  handicapIndex,
  dualData,
  scoreDifferentials,
  scoreTrend,
}: HandicapBreakdownSheetProps) {
  // Build merged rows (last 20, most recent first)
  const rows: Row[] = dualData
    .slice()
    .reverse()
    .map((d) => {
      const diff = scoreDifferentials.find((s) => s.round_index === d.round_index);
      const trend = scoreTrend.find((s) => s.round_index === d.round_index);
      return {
        round_index: d.round_index,
        course_name: trend?.course_name ?? null,
        score: diff?.score ?? d.total_score ?? null,
        course_rating: diff?.course_rating ?? null,
        slope_rating: diff?.slope_rating ?? null,
        differential: d.differential ?? null,
        used_in_hi: d.used_in_hi ?? null,
      };
    });

  // WHS math for the explanation panel
  const validDiffs = rows
    .filter((r) => r.differential != null)
    .map((r) => r.differential!);
  const n = Math.min(validDiffs.length, 20);
  const { countUsed, adjustment } = whsWindow(n);

  const usedDiffs = rows
    .filter((r) => r.used_in_hi === true && r.differential != null)
    .map((r) => r.differential!);
  const diffAvg = usedDiffs.length
    ? usedDiffs.reduce((a, b) => a + b, 0) / usedDiffs.length
    : null;

  const hasRatedRounds = rows.some((r) => r.course_rating != null);

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Handicap Index</SheetTitle>
          <SheetDescription>
            {formatHandicapIndex(handicapIndex)} HCP
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">

              {/* Formula */}
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

              {/* The math */}
              {handicapIndex != null && n >= 3 && (
                <div>
                  <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-3">
                    Current Calculation
                  </div>
                  <div className="bg-accent rounded-card p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rounds in window</span>
                      <span className="font-semibold text-card-foreground">{n} of 20</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Best differentials used</span>
                      <span className="font-semibold text-card-foreground">{countUsed}</span>
                    </div>
                    {usedDiffs.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Their average</span>
                        <span className="font-semibold text-card-foreground font-mono">
                          {diffAvg?.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {adjustment !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">WHS adjustment</span>
                        <span className="font-semibold text-card-foreground font-mono">
                          {adjustment > 0 ? `+${adjustment}` : adjustment}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="text-sm font-bold text-primary">Handicap Index</span>
                      <span className="text-sm font-black text-primary font-mono">
                        {formatHandicapIndex(handicapIndex)}
                      </span>
                    </div>
                  </div>

                  {adjustment !== 0 && (
                    <div className="mt-2 px-1 text-label text-muted-foreground leading-relaxed">
                      With only {n} rounds, WHS applies a {adjustment} adjustment to encourage more play before the index fully stabilizes.
                    </div>
                  )}
                </div>
              )}

              {/* Per-round table */}
              <div>
                <div className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground mb-3">
                  Recent Rounds · Last {rows.length}
                </div>

                {rows.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">No rounds yet</div>
                ) : (
                  <div className="rounded-card border border-border overflow-hidden divide-y divide-border">
                    {/* Column headers */}
                    <div className="grid grid-cols-handicap-breakdown gap-2 px-4 py-2 bg-muted text-meta font-bold uppercase tracking-kicker text-muted-foreground">
                      <span>Course</span>
                      <span className="text-right w-10">Score</span>
                      <span className="text-right w-16">Diff</span>
                      <span className="w-5" />
                    </div>

                    {rows.map((row) => {
                      const isUsed = row.used_in_hi === true;
                      const noData = row.differential == null;
                      return (
                        <div
                          key={row.round_index}
                          className={`grid grid-cols-handicap-breakdown gap-2 px-4 py-3 items-center ${
                            isUsed ? "bg-accent" : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-card-foreground truncate">
                              {row.course_name
                                ? formatCourseName(row.course_name)
                                : `Round ${row.round_index}`}
                            </div>
                            {row.course_rating != null && row.slope_rating != null && (
                              <div className="text-meta text-muted-foreground font-mono mt-0.5">
                                {row.course_rating} / {row.slope_rating}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-mono font-semibold text-secondary-foreground text-right w-10">
                            {row.score ?? "—"}
                          </div>
                          <div className={`text-sm font-mono font-bold text-right w-16 ${
                            noData
                              ? "text-muted-foreground"
                              : isUsed
                                ? "text-primary"
                                : "text-muted-foreground"
                          }`}>
                            {row.differential != null
                              ? row.differential >= 0
                                ? `+${row.differential.toFixed(1)}`
                                : row.differential.toFixed(1)
                              : "—"}
                          </div>
                          <div className="w-5 flex justify-center">
                            {isUsed ? (
                              <CheckCircle className="size-3.5 text-primary shrink-0" />
                            ) : row.differential != null ? (
                              <Circle className="size-3.5 text-muted-foreground shrink-0" />
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {usedDiffs.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-label text-muted-foreground px-1">
                    <CheckCircle className="size-3 text-primary shrink-0" />
                    <span>Green rows are the {countUsed} best differential{countUsed !== 1 ? "s" : ""} used in your index</span>
                  </div>
                )}
              </div>

              {/* WHS context note */}
              <div className="text-label text-muted-foreground leading-relaxed pb-4 px-1">
                The World Handicap System uses your best {countUsed || "N"} differentials from the last 20 rounds. Differentials measure how well you played relative to the course difficulty.
              </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
